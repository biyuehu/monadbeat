from fastapi import APIRouter, Depends, HTTPException, Query, Request
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


@router.get("/")
def list_submissions(
  problem_slug: str | None = None,
  page: int = Query(default=1, ge=1),
  page_size: int = Query(default=20, ge=1, le=100),
  user: User = Depends(get_current_user),
  session: Session = Depends(get_session),
) -> SubmissionListResponse:
  base_query = (
    select(Submission, Problem.title, Problem.slug)
    .join(Problem)
    .where(Submission.user_id == user.id)
    .order_by(col(Submission.submitted_at).desc())
  )

  # For non-admin users, silently hide submissions for unpublished/draft problems
  if not user.is_admin:
    base_query = base_query.where(Problem.is_published == True)

  if problem_slug is not None:
    base_query = base_query.where(Problem.slug == problem_slug)

  total = session.exec(select(func.count()).select_from(base_query.subquery())).one()

  items = []
  for submission, title, slug in session.exec(
    base_query.offset((page - 1) * page_size).limit(page_size)
  ).all():
    assert submission.id is not None
    items.append(
      SubmissionListItem(
        id=submission.id,
        problem_slug=slug,
        problem_title=title,
        user_answer=submission.user_answer,
        is_correct=submission.is_correct,
        judge_detail=submission.judge_detail,
        submitted_at=submission.submitted_at,
      )
    )

  return SubmissionListResponse(
    items=items, total=total, page=page, page_size=page_size
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
