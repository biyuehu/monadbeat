from datetime import datetime

from pydantic import BaseModel


class SubmitRequest(BaseModel):
  problem_id: int
  user_answer: str


class SubmissionResponse(BaseModel):
  id: int
  problem_id: int
  is_correct: bool
  judge_detail: str | None
  submitted_at: datetime

class SubmissionListItem(BaseModel):
  id: int
  problem_id: int
  problem_title: str
  user_answer: str
  is_correct: bool
  judge_detail: str | None
  submitted_at: datetime

class SubmissionListResponse(BaseModel):
  items: list[SubmissionListItem]
  total: int
  page: int
  page_size: int