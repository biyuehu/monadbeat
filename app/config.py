from pydantic_settings import BaseSettings


class Settings(BaseSettings):
  database_url: str = "postgresql+psycopg://postgres:postgres@localhost:5432/monadbeat"
  ghc_binary: str = "ghc"
  ghc_timeout_sec: int = 10

  jwt_secret: str = "dev-secret-change-me"
  jwt_algorithm: str = "HS256"
  jwt_expire_minutes: int = 60 * 24 * 7  # 7 天

  site_url: str = "http://localhost:8000"
  github_client_id: str = ""
  github_client_secret: str = ""

  @property
  def github_redirect_uri(self) -> str:
    return f"{self.site_url}/auth/github/callback"

  @property
  def frontend_url(self) -> str:
    return self.site_url

  class Config:
    env_file = ".env"


settings = Settings()
