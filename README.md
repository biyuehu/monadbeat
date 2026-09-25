# MonadBeat

A Haskell practice platform. Answer type-signature, implementation, and behavior questions; get judged by GHC; climb the leaderboard.

## Stack

- **Backend** — FastAPI + SQLModel + PostgreSQL (psycopg) · PyJWT auth via GitHub OAuth · slowapi rate limiting
- **Judge** — GHC type checking in a temp sandbox (`-fno-code`) for `infer_type` / `find_function`; in-process for `predict_behavior`
- **Frontend** — SolidJS + Vite + TypeScript · Effect for async data layer + schema validation · Biome for lint/format
- **Legacy demo** — `web/` holds the original static HTML/CSS/JS prototype

## Layout

```txt

app/                 FastAPI backend
  auth/              github oauth, jwt, dependencies
  dtos/              pydantic request/response models
  judge/             ghc runner, judge dispatcher
  models/            sqlmodel tables
  routers/           auth, problems, submissions, leaderboard, user
  services/          leaderboard cache, scoring
src/                 Solid frontend
  lib/               effect schema, api, storage, theme
  context/           auth, filter
  components/        headbar, filter panel
  routes/            problems, quiz, account, leaderboard, profile
  styles/            per-page css
public/              static datas + assets
web/                 original js/html prototype

```

## Dev

Requires `uv` (backend) and `bun` (frontend).

```sh
just dev              # backend dev server
just lint             # ruff check --fix + format
just check            # pyright
just build-db         # create sqlmodel tables
```

```sh
bun run dev           # vite dev server
bun run build         # tsc -b && vite build
bunx biome check src  # lint
```

## Config

Environment (`.env` or env vars), see `app/config.py`:

- `DATABASE_URL` — postgresql+psycopg://...
- `GHC_BINARY`, `GHC_TIMEOUT_SEC`
- `JWT_SECRET`, `JWT_ALGORITHM`, `JWT_EXPIRE_MINUTES`
- `SITE_URL`, `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`
