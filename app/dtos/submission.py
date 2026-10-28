from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

from app.config import settings


class SubmitRequest(BaseModel):
  problem_slug: str
  user_answer: str = Field(max_length=settings.max_answer_length)


class SubmissionResponse(BaseModel):
  id: int
  problem_slug: str
  is_correct: bool
  judge_detail: str | None
  submitted_at: datetime


class SubmissionListItem(BaseModel):
  id: int
  problem_slug: str
  problem_title: str
  user_answer: str
  is_correct: bool
  judge_detail: str | None
  submitted_at: datetime


class SubmissionCursorListResponse(BaseModel):
  items: list[SubmissionListItem]
  next_cursor: str | None = None
  has_more: bool = False
  total: int | None = None


# Keep SubmissionListResponse for backwards compatibility
SubmissionListResponse = SubmissionCursorListResponse


class ProgressItem(BaseModel):
  problem_slug: str
  status: Literal["correct", "wrong"]
  attempts: int
  first_attempt_correct: bool = False


class ProgressResponse(BaseModel):
  items: list[ProgressItem]
