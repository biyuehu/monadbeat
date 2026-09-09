from datetime import UTC, datetime, timedelta

import jwt

from app.config import settings


def create_access_token(user_id: int) -> str:
  payload = {
    "sub": str(user_id),
    "exp": datetime.now(UTC) + timedelta(minutes=settings.jwt_expire_minutes),
  }
  return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def decode_access_token(token: str) -> int | None:
  try:
    payload = jwt.decode(
      token, settings.jwt_secret, algorithms=[settings.jwt_algorithm]
    )
    return int(payload["sub"])
  except jwt.PyJWTError:
    return None
