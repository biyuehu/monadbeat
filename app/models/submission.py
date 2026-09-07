from datetime import UTC, datetime

from sqlmodel import Field, SQLModel


class Submission(SQLModel, table=True):
  id: int | None = Field(default=None, primary_key=True)
  user_id: int = Field(foreign_key="user.id")
  problem_id: int = Field(foreign_key="problem.id")
  user_answer: str
  is_correct: bool
  judge_detail: str | None = None
  submitted_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
