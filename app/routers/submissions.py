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


@router.get("/")
def list_submissions(
  problem_slug: str | None = None,
  page: int = 1,
  page_size: int = 20,
  user: User = Depends(get_current_user),
  session: Session = Depends(get_session),
) -> SubmissionListResponse:
  base_query = (
    select(Submission, Problem.title, Problem.slug)
    .join(Problem)
    .where(Submission.user_id == user.id)
    .order_by(col(Submission.submitted_at).desc())
  )
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
  rows = session.exec(
    select(Problem.slug, func.count(), func.bool_or(Submission.is_correct))
    .select_from(Submission)
    .join(Problem)
    .where(Submission.user_id == user.id)
    .group_by(Problem.slug)
  ).all()
  return ProgressResponse(
    items=[
      ProgressItem(
        problem_slug=slug,
        status="correct" if solved else "wrong",
        attempts=count,
      )
      for slug, count, solved in rows
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
  problem = session.exec(
    select(Problem).where(
      Problem.slug == body.problem_slug, Problem.is_published == True
    )
  ).first()
  if problem is None or problem.id is None:
    raise HTTPException(status_code=404, detail="Problem not found")

  result = judge(problem.judge_config, body.user_answer)
  assert user.id is not None
  submission = Submission(
    user_id=user.id,
    problem_id=problem.id,
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
    problem_slug=problem.slug,
    is_correct=submission.is_correct,
    judge_detail=submission.judge_detail,
    submitted_at=submission.submitted_at,
  )
