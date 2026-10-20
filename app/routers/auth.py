import secrets

import httpx
from fastapi import APIRouter, Cookie, Depends, HTTPException
from fastapi.responses import RedirectResponse
from sqlmodel import Session, select

from app.auth.github import exchange_code_for_token, fetch_github_user
from app.auth.jwt import create_access_token
from app.config import settings
from app.db import get_session
from app.errors import AppException
from app.models.user import User

router = APIRouter(prefix="/auth", tags=["auth"])

_OAUTH_STATE_COOKIE = "monadbeat_oauth_state"


@router.get("/github/login")
def github_login() -> RedirectResponse:
  state = secrets.token_urlsafe(24)
  url = (
    "https://github.com/login/oauth/authorize"
    f"?client_id={settings.github_client_id}"
    f"&redirect_uri={settings.github_redirect_uri}"
    f"&scope=read:user"
    f"&state={state}"
  )
  response = RedirectResponse(url)
  response.set_cookie(
    _OAUTH_STATE_COOKIE,
    state,
    httponly=True,
    samesite="lax",
    secure=settings.frontend_url.startswith("https"),
    max_age=600,
  )
  return response


@router.get("/github/callback")
async def github_callback(
  code: str,
  state: str,
  session: Session = Depends(get_session),
  oauth_state: str | None = Cookie(default=None, alias=_OAUTH_STATE_COOKIE),
) -> RedirectResponse:
  if oauth_state is None or not secrets.compare_digest(state, oauth_state):
    raise AppException(
      status_code=400,
      code="OAUTH_STATE_MISMATCH",
      message="OAuth state mismatch — possible CSRF attack",
    )

  try:
    access_token = await exchange_code_for_token(code)
    gh_user = await fetch_github_user(access_token)
  except httpx.HTTPError as exc:
    raise HTTPException(status_code=502, detail=f"github oauth failed: {exc}") from exc

  github_id = str(gh_user["id"])
  is_super = (
    settings.superadmin_github_id != "" and github_id == settings.superadmin_github_id
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
  response = RedirectResponse(
    f"{settings.frontend_url}/auth/callback?token={jwt_token}"
  )
  # Clear the state cookie
  response.delete_cookie(_OAUTH_STATE_COOKIE)
  return response
