import base64
import json
import math
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlmodel import Session, col, func, select

from app.auth.dependencies import get_current_user, require_not_banned
from app.config import settings
from app.db import get_session
from app.dtos.submission import (
  ProgressItem,
  ProgressResponse,
  SubmissionListItem,
  SubmissionListResponse,
  SubmissionResponse,
  SubmitRequest,
)
from app.judge.dispatcher import Correct, Wrong, judge
from app.limiter import limiter
from app.models.problem import Problem
from app.models.submission import Submission
from app.models.user import User

router = APIRouter(prefix="/submissions", tags=["submissions"])


def _encode_cursor(submitted_at: datetime, submission_id: int) -> str:
  payload = {"t": submitted_at.isoformat(), "id": submission_id}
  return base64.urlsafe_b64encode(json.dumps(payload).encode("utf-8")).decode("ascii")


def _decode_cursor(cursor: str) -> tuple[datetime, int]:
  try:
    payload = json.loads(
      base64.urlsafe_b64decode(cursor.encode("ascii")).decode("utf-8")
    )
    return datetime.fromisoformat(payload["t"]), int(payload["id"])
  except (ValueError, KeyError, TypeError):
    raise HTTPException(status_code=400, detail="Invalid pagination cursor")


@router.get("/")
def list_submissions(
  problem_slug: str | None = None,
  cursor: str | None = None,
  limit: int = 20,
  page: int | None = None,
  page_size: int | None = None,
  user: User = Depends(get_current_user),
  session: Session = Depends(get_session),
) -> SubmissionListResponse:
  base_query = (
    select(Submission, Problem.title, Problem.slug)
    .join(Problem)
    .where(Submission.user_id == user.id)
    .order_by(col(Submission.submitted_at).desc(), col(Submission.id).desc())
  )

  # For non-admin users, silently hide submissions for unpublished/draft problems
  if not user.is_admin:
    base_query = base_query.where(Problem.is_published == True)

  if problem_slug is not None:
    base_query = base_query.where(Problem.slug == problem_slug)

  effective_limit = page_size if page is not None and page_size is not None else limit

  # Backward-compatible offset pagination when ?page= is explicitly provided and no ?cursor=
  if page is not None and cursor is None:
    total = session.exec(select(func.count()).select_from(base_query.subquery())).one()
    query = base_query.offset((page - 1) * effective_limit).limit(effective_limit + 1)
    results = session.exec(query).all()
    has_more = len(results) > effective_limit
    page_results = results[:effective_limit]

    items = [
      SubmissionListItem(
        id=submission.id,
        problem_slug=slug,
        problem_title=title,
        user_answer=submission.user_answer,
        is_correct=submission.is_correct,
        judge_detail=submission.judge_detail,
        submitted_at=submission.submitted_at,
      )
      for submission, title, slug in page_results
      if submission.id is not None
    ]

    next_cursor = None
    if has_more and page_results:
      last_sub = page_results[-1][0]
      if last_sub.id is not None:
        next_cursor = _encode_cursor(last_sub.submitted_at, last_sub.id)

    return SubmissionListResponse(
      items=items,
      next_cursor=next_cursor,
      has_more=has_more,
      total=total,
    )

  # Cursor pagination on (submitted_at, id)
  if cursor is not None:
    cursor_time, cursor_id = _decode_cursor(cursor)
    base_query = base_query.where(
      (col(Submission.submitted_at) < cursor_time)
      | (
        (col(Submission.submitted_at) == cursor_time) & (col(Submission.id) < cursor_id)
      )
    )

  query = base_query.limit(effective_limit + 1)
  results = session.exec(query).all()
  has_more = len(results) > effective_limit
  page_results = results[:effective_limit]

  items = [
    SubmissionListItem(
      id=submission.id,
      problem_slug=slug,
      problem_title=title,
      user_answer=submission.user_answer,
      is_correct=submission.is_correct,
      judge_detail=submission.judge_detail,
      submitted_at=submission.submitted_at,
    )
    for submission, title, slug in page_results
    if submission.id is not None
  ]

  next_cursor = None
  if has_more and page_results:
    last_sub = page_results[-1][0]
    if last_sub.id is not None:
      next_cursor = _encode_cursor(last_sub.submitted_at, last_sub.id)

  return SubmissionListResponse(
    items=items,
    next_cursor=next_cursor,
    has_more=has_more,
  )


@router.get("/progress")
def list_progress(
  user: User = Depends(get_current_user),
  session: Session = Depends(get_session),
) -> ProgressResponse:
  sub_ranked_query = (
    select(
      col(Submission.problem_id),
      col(Submission.is_correct),
      func.row_number()
      .over(
        partition_by=col(Submission.problem_id),
        order_by=col(Submission.submitted_at).asc(),
      )
      .label("rn"),
    )
    .join(Problem, col(Submission.problem_id) == col(Problem.id))
    .where(col(Submission.user_id) == user.id)
  )

  # Non-admin users only see progress on published problems
  if not user.is_admin:
    sub_ranked_query = sub_ranked_query.where(col(Problem.is_published) == True)

  sub_ranked = sub_ranked_query.subquery()

  first_attempts = session.exec(
    select(sub_ranked.c.problem_id, sub_ranked.c.is_correct).where(sub_ranked.c.rn == 1)
  ).all()
  first_correct_map = {prob_id: bool(correct) for prob_id, correct in first_attempts}

  rows_query = (
    select(
      col(Problem.id),
      col(Problem.slug),
      func.count(col(Submission.id)),
      func.bool_or(col(Submission.is_correct)),
    )
    .select_from(Submission)
    .join(Problem)
    .where(col(Submission.user_id) == user.id)
  )

  if not user.is_admin:
    rows_query = rows_query.where(col(Problem.is_published) == True)

  rows = session.exec(rows_query.group_by(col(Problem.id), col(Problem.slug))).all()

  return ProgressResponse(
    items=[
      ProgressItem(
        problem_slug=slug,
        status="correct" if solved else "wrong",
        attempts=count,
        first_attempt_correct=first_correct_map.get(prob_id, False),
      )
      for prob_id, slug, count, solved in rows
    ]
  )


@router.post("/")
@limiter.limit(settings.submit_rate_limit)
def submit(
  request: Request,
  body: SubmitRequest,
  user: User = Depends(require_not_banned),
  session: Session = Depends(get_session),
) -> SubmissionResponse:
  problem_query = select(Problem).where(Problem.slug == body.problem_slug)
  if not user.is_admin:
    problem_query = problem_query.where(Problem.is_published == True)

  problem = session.exec(problem_query).first()
  if problem is None or problem.id is None:
    raise HTTPException(status_code=404, detail="Problem not found")

  problem_id = problem.id
  problem_slug = problem.slug
  judge_config = problem.judge_config
  assert user.id is not None
  user_id = user.id

  # Cooldown check for predict_behavior to prevent brute-forcing
  if judge_config.problem_type == "predict_behavior":
    recent_submissions = session.exec(
      select(Submission)
      .where(Submission.user_id == user_id, Submission.problem_id == problem_id)
      .order_by(col(Submission.submitted_at).desc(), col(Submission.id).desc())
      .limit(5)
    ).all()

    # Count consecutive wrong attempts from the most recent one
    consecutive_wrongs = 0
    for sub in recent_submissions:
      if sub.is_correct:
        break
      consecutive_wrongs += 1

    if consecutive_wrongs > 0 and recent_submissions:
      last_sub = recent_submissions[0]
      # 1 wrong: 5s, 2 wrongs: 15s, 3+ wrongs: 30s
      cooldown_seconds = (
        5 if consecutive_wrongs == 1 else (15 if consecutive_wrongs == 2 else 30)
      )
      now_time = datetime.now(UTC).astimezone().replace(tzinfo=None)
      last_time = last_sub.submitted_at
      if last_time.tzinfo is not None:
        last_time = last_time.replace(tzinfo=None)
      elapsed = (now_time - last_time).total_seconds()
      remaining = cooldown_seconds - elapsed
      if remaining > 0:
        session.rollback()
        raise HTTPException(
          status_code=429,
          detail=f"Cooldown active: please wait {math.ceil(remaining)}s before trying this question again.",
        )

  # Rollback/close initial read transaction so GHC execution does not hold DB connection
  session.rollback()

  result = judge(judge_config, body.user_answer)

  submission = Submission(
    user_id=user_id,
    problem_id=problem_id,
    user_answer=body.user_answer,
    is_correct=result == Correct(),
    judge_detail=result.detail if isinstance(result, Wrong) else None,
  )
  session.add(submission)
  session.commit()
  session.refresh(submission)

  assert submission.id is not None
  return SubmissionResponse(
    id=submission.id,
    problem_slug=problem_slug,
    is_correct=submission.is_correct,
    judge_detail=submission.judge_detail,
    submitted_at=submission.submitted_at,
  )
