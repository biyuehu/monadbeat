from fastapi import Depends, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlmodel import Session

from app.auth.jwt import decode_access_token
from app.config import settings
from app.db import get_session
from app.dtos.user import Role
from app.errors import AppException
from app.models.user import User
from app.services.ban import active_ban

_bearer_scheme = HTTPBearer(auto_error=False)


def get_current_user(
  credentials: HTTPAuthorizationCredentials | None = Depends(_bearer_scheme),
  session: Session = Depends(get_session),
) -> User:
  if credentials is None:
    raise AppException(
      status_code=status.HTTP_401_UNAUTHORIZED,
      code="UNAUTHORIZED",
      message="User not authenticated",
    )

  user_id = decode_access_token(credentials.credentials)
  if user_id is None:
    raise AppException(
      status_code=status.HTTP_401_UNAUTHORIZED,
      code="TOKEN_INVALID",
      message="Access token is invalid or expired",
    )

  user = session.get(User, user_id)
  if user is None:
    raise AppException(
      status_code=status.HTTP_401_UNAUTHORIZED,
      code="USER_NOT_FOUND",
      message="User not found",
    )

  return user


def get_current_user_optional(
  credentials: HTTPAuthorizationCredentials | None = Depends(_bearer_scheme),
  session: Session = Depends(get_session),
) -> User | None:
  if credentials is None:
    return None
  user_id = decode_access_token(credentials.credentials)
  if user_id is None:
    return None
  return session.get(User, user_id)


def is_superadmin(user: User) -> bool:
  return (
    settings.superadmin_github_id != ""
    and user.github_id == settings.superadmin_github_id
  )


def role_of(user: User) -> Role:
  if is_superadmin(user):
    return "superadmin"
  if user.is_admin:
    return "admin"
  return "user"


def require_admin(user: User = Depends(get_current_user)) -> User:
  if not user.is_admin:
    raise AppException(
      status_code=status.HTTP_403_FORBIDDEN,
      code="FORBIDDEN_NOT_ADMIN",
      message="User is not an administrator",
    )
  return user


def require_superadmin(user: User = Depends(get_current_user)) -> User:
  if not is_superadmin(user):
    raise AppException(
      status_code=status.HTTP_403_FORBIDDEN,
      code="FORBIDDEN_NOT_SUPERADMIN",
      message="User is not a superadmin",
    )
  return user


def require_not_banned(
  user: User = Depends(get_current_user),
  session: Session = Depends(get_session),
) -> User:
  assert user.id is not None
  ban = active_ban(session, user.id)
  if ban is not None:
    raise AppException(
      status_code=status.HTTP_403_FORBIDDEN,
      code="USER_BANNED",
      message=f"Your account is banned: {ban.reason}",
      detail=ban.reason,
    )
  return user
