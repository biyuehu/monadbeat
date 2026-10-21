from datetime import datetime
from typing import Literal

from pydantic import BaseModel

Role = Literal["user", "admin", "superadmin"]


class MeResponse(BaseModel):
  username: str
  avatar_url: str | None
  created_at: datetime
  role: Role
  is_banned: bool
  ban_reason: str | None = None
  ban_expires_at: datetime | None = None


class PublicUserResponse(BaseModel):
  username: str
  avatar_url: str | None
  created_at: datetime


class TokenResponse(BaseModel):
  access_token: str
  token_type: str = "bearer"
