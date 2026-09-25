import httpx

from app.config import settings

_GITHUB_TOKEN_URL = "https://github.com/login/oauth/access_token"
_GITHUB_USER_URL = "https://api.github.com/user"


async def exchange_code_for_token(code: str) -> str:
  async with httpx.AsyncClient() as client:
    resp = await client.post(
      _GITHUB_TOKEN_URL,
      headers={"Accept": "application/json"},
      data={
        "client_id": settings.github_client_id,
        "client_secret": settings.github_client_secret,
        "code": code,
        "redirect_uri": settings.github_redirect_uri,
      },
    )
    resp.raise_for_status()
    data = resp.json()
    if "access_token" not in data:
      raise ValueError(f"GitHub OAuth did not return of access_token: {data}")
    return data["access_token"]


async def fetch_github_user(access_token: str) -> dict:
  async with httpx.AsyncClient() as client:
    resp = await client.get(
      _GITHUB_USER_URL,
      headers={
        "Authorization": f"Bearer {access_token}",
        "Accept": "application/vnd.github+json",
      },
    )
    resp.raise_for_status()
    return resp.json()
