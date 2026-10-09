from datetime import UTC, datetime

from sqlmodel import Field, SQLModel


class Ban(SQLModel, table=True):
  id: int | None = Field(default=None, primary_key=True)
  user_id: int = Field(foreign_key="user.id", index=True)
  reason: str
  banned_by: int = Field(foreign_key="user.id")
  banned_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
  expires_at: datetime | None = None
  lifted_at: datetime | None = None
  lifted_by: int | None = Field(default=None, foreign_key="user.id")