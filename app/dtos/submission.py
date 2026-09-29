from datetime import datetime

from pydantic import BaseModel, Field

from app.config import settings
from app.dtos.pagination import PaginatedResponse


class SubmitRequest(BaseModel):
  problem_id: int
  user_answer: str = Field(max_length=settings.max_answer_length)


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

SubmissionListResponse = PaginatedResponse[SubmissionListItem]