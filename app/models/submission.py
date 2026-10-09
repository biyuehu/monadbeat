from datetime import UTC, datetime

from sqlalchemy import Index
from sqlmodel import Field, SQLModel


class Submission(SQLModel, table=True):
  __table_args__ = (
    Index("ix_submission_user_correct", "user_id", "is_correct"),
    Index("ix_submission_problem_correct", "problem_id", "is_correct"),
  )

  id: int | None = Field(default=None, primary_key=True)
  user_id: int = Field(foreign_key="user.id")
  problem_id: int = Field(foreign_key="problem.id")
  user_answer: str
  is_correct: bool
  judge_detail: str | None = None
  submitted_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
