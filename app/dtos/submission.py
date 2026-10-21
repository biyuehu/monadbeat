from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

from app.config import settings
from app.dtos.pagination import PaginatedResponse


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


SubmissionListResponse = PaginatedResponse[SubmissionListItem]


class ProgressItem(BaseModel):
  problem_slug: str
  status: Literal["correct", "wrong"]
  attempts: int
  first_attempt_correct: bool = False


class ProgressResponse(BaseModel):
  items: list[ProgressItem]
