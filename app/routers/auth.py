import httpx
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import RedirectResponse
from sqlmodel import Session, select

from app.auth.github import exchange_code_for_token, fetch_github_user
from app.auth.jwt import create_access_token
from app.config import settings
from app.db import get_session
from app.models.user import User

router = APIRouter(prefix="/auth", tags=["auth"])


@router.get("/github/login")
def github_login() -> RedirectResponse:
  url = (
    "https://github.com/login/oauth/authorize"
    f"?client_id={settings.github_client_id}"
    f"&redirect_uri={settings.github_redirect_uri}"
    "&scope=read:user"
  )
  return RedirectResponse(url)


@router.get("/github/callback")
async def github_callback(
  code: str, session: Session = Depends(get_session)
) -> RedirectResponse:
  try:
    access_token = await exchange_code_for_token(code)
    gh_user = await fetch_github_user(access_token)
  except httpx.HTTPError as exc:
    raise HTTPException(status_code=502, detail=f"github oauth failed: {exc}") from exc

  github_id = str(gh_user["id"])
  is_super = (
    settings.superadmin_github_id != ""
    and github_id == settings.superadmin_github_id
  )
  user = session.exec(select(User).where(User.github_id == github_id)).first()

  if user is None:
    user = User(
      github_id=github_id,
      username=gh_user["login"],
      avatar_url=gh_user.get("avatar_url"),
      is_admin=is_super,
    )
    session.add(user)
    session.commit()
    session.refresh(user)
  elif is_super and not user.is_admin:
    user.is_admin = True
    session.add(user)
    session.commit()
    session.refresh(user)

  assert user.id is not None
  jwt_token = create_access_token(user.id)
  return RedirectResponse(
    f"{settings.frontend_url}/auth/callback?token={jwt_token}"
  )  # TODO: frontend
