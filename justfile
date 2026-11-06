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

gen-types:
  uv run python -m scripts.export_openapi
  bunx openapi-typescript openapi.json -o src/types/api-types.ts

seed:
  uv run python -m scripts.seed

docker-up:
  docker compose up -d --build

docker-down:
  docker compose down

docker-seed:
  docker compose exec backend uv run python -m scripts.seed

docker-logs:
  docker compose logs -f
