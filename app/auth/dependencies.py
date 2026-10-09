from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlmodel import Session

from app.auth.jwt import decode_access_token
from app.config import settings
from app.db import get_session
from app.models.user import User
from app.services.ban import active_ban

_bearer_scheme = HTTPBearer(auto_error=False)


def get_current_user(
  credentials: HTTPAuthorizationCredentials | None = Depends(_bearer_scheme),
  session: Session = Depends(get_session),
) -> User:
  if credentials is None:
    raise HTTPException(
      status_code=status.HTTP_401_UNAUTHORIZED, detail="User not authenticated"
    )

  user_id = decode_access_token(credentials.credentials)
  if user_id is None:
    raise HTTPException(
      status_code=status.HTTP_401_UNAUTHORIZED, detail="Access token is invalid"
    )

  user = session.get(User, user_id)
  if user is None:
    raise HTTPException(
      status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found"
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
    user.is_admin
    and settings.superadmin_github_id != ""
    and user.github_id == settings.superadmin_github_id
  )


def require_admin(user: User = Depends(get_current_user)) -> User:
  if not user.is_admin:
    raise HTTPException(
      status_code=status.HTTP_403_FORBIDDEN, detail="User is not an administrator"
    )
  return user


def require_superadmin(user: User = Depends(get_current_user)) -> User:
  if not is_superadmin(user):
    raise HTTPException(
      status_code=status.HTTP_403_FORBIDDEN, detail="User is not a superadmin"
    )
  return user


def require_not_banned(
  user: User = Depends(get_current_user),
  session: Session = Depends(get_session),
) -> User:
  assert user.id is not None
  ban = active_ban(session, user.id)
  if ban is not None:
    raise HTTPException(
      status_code=status.HTTP_403_FORBIDDEN,
      detail=f"Your account is banned: {ban.reason}",
    )
  return user