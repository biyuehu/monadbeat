from slowapi import Limiter
from slowapi.util import get_remote_address
from starlette.requests import Request


def _client_key(request: Request) -> str:
  forwarded = request.headers.get("x-forwarded-for")
  if forwarded:
    first = forwarded.split(",")[0].strip()
    if first:
      return first
  return get_remote_address(request)


limiter = Limiter(key_func=_client_key)
