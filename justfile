set windows-shell := ["powershell"]

dev:
  uv run uvicorn app.main:app --reload

lint:
  uv run ruff check --fix .
  uv run ruff format .

check:
  uv run pyright

build-db:
  uv run python -c "from app.db import init_db; init_db()"