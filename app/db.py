from sqlmodel import Session, SQLModel, create_engine

from app.config import settings

# Importing the models registers them with SQLModel.metadata.
# Without this, `SQLModel.metadata.create_all` sees an empty schema.
from app.models import ban, problem, submission, user  # noqa: F401

engine = create_engine(
  settings.database_url,
  echo=False,
  connect_args={"connect_timeout": 7},
  pool_pre_ping=True,
)


def init_db() -> None:
  print("Initializing database...")
  SQLModel.metadata.create_all(engine)


def get_session():
  with Session(engine) as session:
    yield session
