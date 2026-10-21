from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from app.auth.dependencies import get_current_user, role_of
from app.db import get_session
from app.dtos.user import MeResponse, PublicUserResponse
from app.models.user import User
from app.services.ban import active_ban

router = APIRouter(tags=["users"])


@router.get("/me")
def get_me(
  user: User = Depends(get_current_user),
  session: Session = Depends(get_session),
) -> MeResponse:
  assert user.id is not None
  ban = active_ban(session, user.id)
  return MeResponse(
    username=user.username,
    avatar_url=user.avatar_url,
    created_at=user.created_at,
    role=role_of(user),
    is_banned=ban is not None,
    ban_reason=ban.reason if ban else None,
    ban_expires_at=ban.expires_at if ban else None,
  )


@router.get("/users/{username}")
def get_public_user(
  username: str, session: Session = Depends(get_session)
) -> PublicUserResponse:
  user = session.exec(select(User).where(User.username == username)).first()
  if user is None:
    raise HTTPException(status_code=404, detail="User not found")
  return PublicUserResponse(
    username=user.username,
    avatar_url=user.avatar_url,
    created_at=user.created_at,
  )
