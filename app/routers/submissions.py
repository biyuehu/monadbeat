from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session

from app.db import get_session
from app.judge.dispatcher import Correct, Wrong, judge
from app.models.problem import Problem
from app.models.submission import Submission

router = APIRouter(prefix="/submissions", tags=["submissions"])


""" 
TODO:
?     # 可选,只看某道题的提交记录
&page=1&page_size=20
 """


@router.post("/")
def submit(
  problem_id: int, user_answer: str, session: Session = Depends(get_session)
) -> Submission:
  problem: Problem | None = session.get(Problem, problem_id)
  if problem is None:
    raise HTTPException(status_code=404, detail="Problem not found")

  result = judge(problem.judge_config, user_answer)
  submission = Submission(
    user_id=1,
    problem_id=problem_id,
    user_answer=user_answer,
    is_correct=result == Correct(),
    judge_detail=result.detail if isinstance(result, Wrong) else None,
  )
  session.add(submission)
  session.commit()
  session.refresh(submission)
  return submission
