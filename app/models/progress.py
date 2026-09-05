from datetime import datetime
from enum import Enum

from sqlmodel import Field, SQLModel


class ProgressStatus(str, Enum):
  unsolved = "unsolved"
  attempted = "attempted"
  solved = "solved"


class Progress(SQLModel, table=True):
  user_id: int = Field(foreign_key="user.id", primary_key=True)
  problem_id: int = Field(foreign_key="problem.id", primary_key=True)
  status: ProgressStatus = ProgressStatus.unsolved
  first_solved_at: datetime | None = None
  attempts_count: int = 0
