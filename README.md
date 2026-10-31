# MonadBeat

[![CI](https://github.com/biyuehu/monadbeat/actions/workflows/ci.yml/badge.svg)](https://github.com/biyuehu/monadbeat/actions/workflows/ci.yml)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![SolidJS](https://img.shields.io/badge/SolidJS-1.9+-2c4f7c?logo=solid&logoColor=white)](https://www.solidjs.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8+-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![GHC](https://img.shields.io/badge/GHC-9.6+-5e5086?logo=haskell&logoColor=white)](https://www.haskell.org/ghc/)
[![License: GPL-3.0](https://img.shields.io/badge/License-GPL3.0-yellow.svg)](LICENSE)

A Haskell practice platform. Answer type-signature, implementation, and behavior questions; get judged by GHC; climb the leaderboard.

## Architecture

```mermaid
flowchart TD
    subgraph Client["Frontend (SolidJS + TypeScript + Effect)"]
        UI["Web SPA Pages<br/>(Problems / Quiz / Leaderboard / Submissions)"]
        Shortcuts["Keyboard Navigation Engine<br/>(Vim-style sequences & single-keys)"]
        ApiClient["Type-safe API Client<br/>(Generated from OpenAPI)"]
    end

    subgraph Backend["Backend API (FastAPI + SQLModel)"]
        Router["API Routers<br/>(auth, problems, submissions, leaderboard, admin)"]
        Auth["Auth & Security<br/>(GitHub OAuth, JWT, slowapi rate limiter)"]
        JudgeDisp["Judge Dispatcher<br/>(infer_type / find_function / predict_behavior)"]
        DBAccess["Database Layer (SQLModel / SQLAlchemy)"]
    end

    subgraph Evaluation["Sandboxed Judge Engine"]
        GHCRunner["GHC Runner<br/>(Temporary sandbox, -fno-code typecheck)"]
        PredictEval["In-Process Choice Evaluator<br/>(Dynamic shuffle & cooldown tracker)"]
    end

    subgraph Storage["Persistent Storage"]
        PostgreSQL[("PostgreSQL Database<br/>(Problems, Users, Submissions, Bans)")]
    end

    UI <--> Shortcuts
    UI --> ApiClient
    ApiClient <== "REST / JSON (JWT)" ==> Router
    Router --> Auth
    Router --> DBAccess
    Router --> JudgeDisp
    JudgeDisp --> GHCRunner
    JudgeDisp --> PredictEval
    DBAccess <== "psycopg" ==> PostgreSQL
```

## Stack

## Dev

Requires `uv` (backend) and `bun` (frontend).

```sh
just dev              # backend dev server (uvicorn --reload)
just lint             # ruff check --fix + format
just check            # pyright
just build-db         # create sqlmodel tables
just gen-types        # export openapi.json and regenerate src/lib/api-types.ts
```

```sh
bun run dev           # vite dev server (runs `just gen-types` first)
bun run build         # tsc -b && vite build (runs `just gen-types` first)
bunx biome check src  # lint
```

`openapi.json` and `src/lib/api-types.ts` are generated and git-ignored. Both `bun run dev` and `bun run build` regenerate them first; run `just gen-types` manually when you only want to refresh the types.

## Config

`.env` (see `.env.example`):

- `JWT_SECRET` — required, no default
- `DATABASE_URL` — postgresql+psycopg://...
- `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` — for OAuth
- `SITE_URL` — backend public URL, used for OAuth callback
- `FRONTEND_URL` — frontend origin(s), comma-separated, used for CORS and post-login redirects

Everything else in `app/config.py` has a working default and can be overridden the same way (`GHC_BINARY`, `GHC_TIMEOUT_SEC`, `GHC_MEMORY_MB`, `MAX_ANSWER_LENGTH`, `SUBMIT_RATE_LIMIT`, `LEADERBOARD_MAX_ENTRIES`, `JWT_ALGORITHM`, `JWT_EXPIRE_MINUTES`).

## Judge

Three problem types are implemented:

- `infer_type` — user writes a type signature; GHC must accept the assembled file
- `find_function` — user writes a function body; GHC must type-check it
- `predict_behavior` — multiple choice, checked in-process

`SatisfyLawConfig` and `FixLazinessConfig` are commented out and not scored.
