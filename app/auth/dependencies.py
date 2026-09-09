from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlmodel import Session

from app.auth.jwt import decode_access_token
from app.db import get_session
from app.models.user import User

_bearer_scheme = HTTPBearer(auto_error=False)


def get_current_user(
  credentials: HTTPAuthorizationCredentials | None = Depends(_bearer_scheme),
  session: Session = Depends(get_session),
) -> User:
  if credentials is None:
    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="未登录")

  user_id = decode_access_token(credentials.credentials)
  if user_id is None:
    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="登录已失效")

  user = session.get(User, user_id)
  if user is None:
    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="用户不存在")

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


def require_admin(user: User = Depends(get_current_user)) -> User:
  if not user.is_admin:
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="需要管理员权限")
  return user