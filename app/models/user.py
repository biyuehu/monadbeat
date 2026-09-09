from datetime import UTC, datetime

from sqlmodel import Field, SQLModel


class User(SQLModel, table=True):
  id: int | None = Field(default=None, primary_key=True)
  github_id: str = Field(unique=True, index=True)
  username: str
  avatar_url: str | None = None
  is_admin: bool = False
  created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
