# TODO

## Backend

<!-- - `satisfy_law` judge not implemented: `_to_display` raises `NotImplementedError`, `judge()` raises `NotImplementedError`. Either implement or remove `SatisfyLawConfig`. -->
<!-- - `fix_laziness` has no `JudgeConfig` variant at all — add `FixLazinessConfig` + dispatcher branch, or drop the type. -->
- `POST /submissions` stores the row but does not touch any per-problem progress — progress is derived from `Submission` rows, which is fine, but there is no `GET` endpoint exposing per-user progress; the frontend reads a static `progress.json`.
- `/submissions` list uses `offset`/`limit`; deep pagination will degrade linearly. Switch to cursor pagination on `submitted_at`.
- `leaderboard` endpoint aggregates in Python. Push aggregation into SQL (`GROUP BY user_id` + `SUM`/`COUNT`) once submission volume passes ~10k correct rows.
- CORS middleware is not configured. Frontend on a different origin will be blocked.
- `decode_access_token` in `app/auth/jwt.py` raises `ValueError`/`KeyError` on a malformed `sub` claim instead of returning `None` (would surface as 500).
- GitHub OAuth flow lacks a `state` parameter (CSRF protection).
- `limiter` keys on `get_remote_address`; behind a reverse proxy all clients share one bucket. Read `X-Forwarded-For`.
- `ghc_runner` returns raw stderr to the client, leaking temp directory paths.

## Frontend

- `QuizRoute` does not call `POST /submissions`; `infer_type` / `find_function` show "Grading not wired to backend yet", `predict_behavior` grades locally.
- `AccountRoute` login reads plaintext passwords from static `users.json`; signup only checks for duplicates locally. Both should go through backend / GitHub OAuth.
- No `/auth/callback` route to receive the token after GitHub OAuth redirect.
- All data in `src/lib/api.ts` is read from `public/datas/*.json`; nothing hits the backend API yet.
- `ProfileRoute` reads static `progress.json` instead of a backend endpoint.
- `Submissions` page does not exist (but `submissions.json` and `fetchSubmissions` do).

## Meta

- `README.md` references `web/` as "legacy demo"; the directory no longer exists in the repo.
