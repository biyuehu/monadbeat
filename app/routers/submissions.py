from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, func, select

from app.auth.dependencies import get_current_user
from app.db import get_session
from app.dtos.submission import (
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
from app.services.leaderboard import leaderboard_cache

router = APIRouter(prefix="/submissions", tags=["submissions"])


@router.get("/")
def list_submissions(
  problem_id: int | None = None,
  page: int = 1,
  page_size: int = 20,
  user: User = Depends(get_current_user),
  session: Session = Depends(get_session),
) -> SubmissionListResponse:
  base_query = (
    select(Submission, Problem.title).join(Problem).where(Submission.user_id == user.id)
  )
  if problem_id is not None:
    base_query = base_query.where(Submission.problem_id == problem_id)

  total = session.exec(select(func.count()).select_from(base_query.subquery())).one()

  items = []
  for submission, title in session.exec(
    base_query.offset((page - 1) * page_size).limit(page_size)
  ).all():
    assert submission.id is not None
    items.append(
      SubmissionListItem(
        id=submission.id,
        problem_id=submission.problem_id,
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


@router.post("/")
@limiter.limit("10/minute")
def submit(
  body: SubmitRequest,
  user: User = Depends(get_current_user),
  session: Session = Depends(get_session),
) -> SubmissionResponse:
  problem: Problem | None = session.get(Problem, body.problem_id)
  if problem is None:
    raise HTTPException(status_code=404, detail="Problem not found")

  result = judge(problem.judge_config, body.user_answer)
  assert user.id is not None
  submission = Submission(
    user_id=user.id,
    problem_id=body.problem_id,
    user_answer=body.user_answer,
    is_correct=result == Correct(),
    judge_detail=result.detail if isinstance(result, Wrong) else None,
  )
  session.add(submission)
  session.commit()
  session.refresh(submission)

  if submission.is_correct:
    leaderboard_cache.refresh_user(session, user.id)

  assert submission.id is not None
  return SubmissionResponse(
    id=submission.id,
    problem_id=submission.problem_id,
    is_correct=submission.is_correct,
    judge_detail=submission.judge_detail,
    submitted_at=submission.submitted_at,
  )
