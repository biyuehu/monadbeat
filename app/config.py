from pydantic_settings import BaseSettings


class Settings(BaseSettings):
  database_url: str = "postgresql+psycopg://postgres:postgres@localhost:5432/monadbeat"
  ghc_binary: str = "ghc"
  ghc_timeout_sec: int = 10

  class Config:
    env_file = ".env"


settings = Settings()
