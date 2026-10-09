from datetime import UTC, datetime

from pydantic import BaseModel, Field, field_validator

from app.dtos.user import Role
from app.models.problem import JudgeConfig


def _to_naive_utc(value: datetime | None) -> datetime | None:
  if value is None:
    return None
  if value.tzinfo is not None:
    return value.astimezone(UTC).replace(tzinfo=None)
  return value


class ProblemCreate(BaseModel):
  slug: str = Field(min_length=1, max_length=120, pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
  title: str = Field(min_length=1, max_length=200)
  difficulty: int = Field(ge=1, le=5)
  category: list[str] = Field(default_factory=list)
  remark: str | None = None
  is_published: bool = False
  judge_config: JudgeConfig


class ProblemUpdate(BaseModel):
  title: str | None = Field(default=None, min_length=1, max_length=200)
  difficulty: int | None = Field(default=None, ge=1, le=5)
  category: list[str] | None = None
  remark: str | None = None
  is_published: bool | None = None
  judge_config: JudgeConfig | None = None


class ProblemAdminItem(BaseModel):
  slug: str
  title: str
  difficulty: int
  problem_type: str
  category: list[str]
  is_published: bool


class ProblemAdminDetail(BaseModel):
  slug: str
  title: str
  difficulty: int
  category: list[str]
  remark: str | None
  is_published: bool
  judge_config: JudgeConfig


class UserAdminItem(BaseModel):
  username: str
  avatar_url: str | None
  role: Role
  created_at: datetime


class BanCreate(BaseModel):
  reason: str = Field(min_length=1, max_length=500)
  expires_at: datetime | None = None

  _normalize_expires_at = field_validator("expires_at")(_to_naive_utc)


class BanItem(BaseModel):
  id: int
  username: str
  reason: str
  banned_at: datetime
  expires_at: datetime | None
  lifted_at: datetime | None
  is_active: bool
