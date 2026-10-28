from pydantic import ValidationError, model_validator
from pydantic_settings import BaseSettings

_DEFAULT_JWT_SECRET = "dev-secret-change-me"


class Settings(BaseSettings):
  database_url: str = "postgresql+psycopg://postgres:postgres@localhost:5432/monadbeat"

  ghc_binary: str = "ghc"
  ghc_timeout_sec: int = 10
  ghc_memory_mb: int = 512
  max_concurrent_ghc: int = 4
  max_answer_length: int = 4096

  submit_rate_limit: str = "10/minute"

  leaderboard_max_entries: int = 200

  jwt_secret: str = _DEFAULT_JWT_SECRET
  jwt_algorithm: str = "HS256"
  jwt_expire_minutes: int = 60 * 24 * 7

  site_url: str = "http://localhost:8000"
  frontend_url: str = "http://localhost:5173"
  github_client_id: str = ""
  github_client_secret: str = ""

  superadmin_github_id: str = ""

  @property
  def github_redirect_uri(self) -> str:
    return f"{self.site_url}/auth/github/callback"

  @property
  def cors_origins(self) -> list[str]:
    return [o.strip() for o in self.frontend_url.split(",") if o.strip()]

  @model_validator(mode="after")
  def _reject_default_jwt_secret(self) -> "Settings":
    if self.jwt_secret == _DEFAULT_JWT_SECRET:
      raise ValueError(
        'JWT_SECRET is not set. Copy .env.example to .env and set a random secret, e.g. `python -c "import secrets; print(secrets.token_hex(32))"`.'
      )
    return self

  class Config:
    env_file = ".env"


def _load_settings() -> Settings:
  try:
    return Settings()
  except ValidationError as exc:
    lines = ["Configuration error:"]
    for err in exc.errors():
      loc = ".".join(str(p) for p in err["loc"])
      lines.append(f"  - {loc}: {err['msg']}")
    lines.append("")
    lines.append("Copy .env.example to .env and fill in the required values.")
    raise SystemExit("\n".join(lines)) from exc


settings = _load_settings()
