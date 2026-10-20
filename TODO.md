# TODO

## Backend

- [x] `leaderboard` aggregated in Python; rewrite as SQL `GROUP BY`.
- [x] `SubmitRequest` / `Submission*` use `problem_slug` instead of `problem_id`, aligned with `/problems/{slug}`.
- [x] `SubmitRequest.user_answer` has no length cap; add `max_length`.
- [x] `ghc_runner` has no memory ceiling; add `+RTS -M{ghc_memory_mb}m` and config knob.
- [x] `POST /submissions` decorator `@limiter.limit("10/minute")` missing `request: Request` param (would 500).
- [x] `httpx` errors from GitHub OAuth not caught (would 500 instead of 502).
- [x] `jwt_secret` had an insecure default; now refuses to start unless overridden.
- [x] `get_problem` / `submit` do not check `Problem.is_published`.
- [x] `db.py` engine missing `pool_pre_ping`.
- [x] `LeaderboardCache` in-process singleton is inconsistent across workers; replaced with stateless `compute_leaderboard`.
- [x] `Problem` table has no `CheckConstraint` and no `problem_type` / `judge_config` consistency check.
- [x] CORS middleware is not configured. Frontend on a different origin will be blocked.
- [x] `decode_access_token` in `app/auth/jwt.py` raises `ValueError`/`KeyError` on a malformed `sub` claim instead of returning `None` (would surface as 500).
- [x] `limiter` keys on `get_remote_address`; behind a reverse proxy all clients share one bucket. Read `X-Forwarded-For`.
- [x] `site_url` (backend) and frontend dev origin disagree; the OAuth callback redirects to `http://localhost:8000/auth/callback?token=...` which is the backend, not the frontend, and 404s. Need a separate `frontend_url` setting.
- [x] Three-role permission model: env-pinned superadmin (`SUPERADMIN_GITHUB_ID`) > DB `is_admin` admin > user. At OAuth login, if the GitHub ID matches the env pin, force `is_admin=true` (so the DB stays consistent even after a DB reset). `require_superadmin` + `require_admin` dependencies.
- [x] Admin endpoints: create / edit / delete / publish problems; promote / demote users to admin.
- [x] `Ban` table + `require_not_banned` on write endpoints; `POST /admin/users/{username}/ban` and `PUT /admin/bans/{ban_id}/lift`.
- [x] `/submissions/progress` — per-user aggregation (`problem_slug`, `status`, `attempts`), used by `ProfileRoute`.
- [ ] `/submissions` list uses `offset`/`limit`; deep pagination degrades linearly. Switch to cursor pagination on `submitted_at`.
- [x] GitHub OAuth flow lacks a `state` parameter (CSRF protection).
- [x] `ghc_runner` returned raw stderr to the client, leaking temp directory paths; now scrubs the sandbox path while keeping the concrete GHC error message. Also fixed `The IO action 'main' is not defined in module 'Main'` by compiling with `-c` so no `main` binding is required.
- [x] No automatic seed mechanism; `scripts/seed.sql` exists but must be run manually. Added `scripts/seed.py` and a `just seed` recipe.
- [ ] Feature: let users tick a box on a submission to import that problem into the bank (import flow / review policy TBD).
- [ ] Hard ban (reject login) is not implemented; current bans only block `POST /submissions`.
- [x] Error responses are bare `HTTPException(detail: str)` with no machine-readable code; the ban reason is embedded in the message string. Define a structured error DTO (`code` / `message`) and a global exception handler so the frontend can branch on 401 / 403 / 404 / 5xx without parsing text.

## Frontend

- [x] `QuizRoute` does not call `POST /submissions`; wire it through the backend.
- [x] `AccountRoute` login reads plaintext passwords from static `users.json`; replaced by GitHub OAuth.
- [x] No `/auth/callback` route to receive the token after GitHub OAuth redirect.
- [x] All data in `src/lib/api.ts` read from `public/datas/*.json`; all endpoints now go through `${API_BASE}`.
- [x] `ProfileRoute` reads static `progress.json`; now derives solved set from `/submissions/progress`.
- [x] `src/lib/schema.ts` hand-written Effect schemas replaced by `openapi-typescript` output (`api-types.ts` + `types.ts`).
- [x] `Submissions` page does not exist; added `SubmissionsRoute`.
- [x] `public/datas/*.json` are no longer read by the frontend; deleted.
- [x] Migration to UnoCSS with CSS-variable theming (`uno.config.ts` + `src/index.css`); legacy per-page CSS removed.
- [ ] Admin UI (problem editor, user list, ban management) is not built; admin endpoints are backend-only.
- [ ] Extract shared utilities / components / helper types where duplicated.
- [x] No global HTTP error handling; `fetchJson` collapses every non-2xx into a generic `Error`, so 401 / 403 / 404 / 5xx are indistinguishable. Introduce `ApiError { status, detail }` and auto sign-out + redirect on 401 (token expiry / server-side revocation).
- [x] `currentUser` / token are read from localStorage with a bare `as MeResponse` cast and no runtime validation; a stale cache from an older schema silently flows into the UI (the `role` rename hit this). Validate the stored shape and drop invalid cache.
- [x] Token expiry is not checked client-side; the UI stays "signed in" until the first 401. Decode the JWT `exp` on write and treat expired tokens as signed out without firing a request.
- [x] localStorage auth state is not synced across tabs; signing out in one tab leaves others showing the old `state`. Listen for the `storage` event and reconcile.

## Meta

- [x] `README.md` references `web/` as "legacy demo"; the directory no longer exists.
- [x] `openapi.json` and `src/lib/api-types.ts` are generated by `just gen-types` and git-ignored; `bun run dev` / `bun run build` regenerate them. Documented in `README.md`.
- 按尝试次数 1:×1.5 3:×1 _:×0.7
- [] CICD, lefthook
