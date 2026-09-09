from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from app.auth.dependencies import get_current_user
from app.db import get_session
from app.dtos.user import MeResponse, PublicUserResponse
from app.models.user import User

router = APIRouter(tags=["users"])


@router.get("/me")
def get_me(user: User = Depends(get_current_user)) -> MeResponse:
  return MeResponse(
    username=user.username,
    avatar_url=user.avatar_url,
    created_at=user.created_at,
    is_admin=user.is_admin,
  )


@router.get("/users/{username}")
def get_public_user(username: str, session: Session = Depends(get_session)) -> PublicUserResponse:
  user = session.exec(select(User).where(User.username == username)).first()
  if user is None:
    raise HTTPException(status_code=404, detail="User not found")
  return PublicUserResponse(
    username=user.username,
    avatar_url=user.avatar_url,
    created_at=user.created_at,
  )