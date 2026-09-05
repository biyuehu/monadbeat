from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session

from app.db import get_session
from app.judge.dispatcher import judge
from app.models.problem import Problem
from app.models.submission import Submission

router = APIRouter(prefix="/submissions", tags=["submissions"])


@router.post("/")
def submit(
  problem_id: int, user_answer: str, session: Session = Depends(get_session)
) -> Submission:
  problem: Problem | None = session.get(Problem, problem_id)
  if problem is None:
    raise HTTPException(status_code=404, detail="Problem not found")

  is_correct = judge(problem.judge_config, user_answer)

  # TODO: user_id
  submission = Submission(
    user_id=1,
    problem_id=problem_id,
    user_answer=user_answer,
    is_correct=is_correct,
    # judge_detail=detail,
  )
  session.add(submission)
  session.commit()
  session.refresh(submission)
  return submission
