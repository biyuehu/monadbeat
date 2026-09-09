from datetime import datetime

from pydantic import BaseModel


class MeResponse(BaseModel):
  username: str
  avatar_url: str | None
  created_at: datetime
  is_admin: bool


class PublicUserResponse(BaseModel):
  username: str
  avatar_url: str | None
  created_at: datetime


class TokenResponse(BaseModel):
  access_token: str
  token_type: str = "bearer"