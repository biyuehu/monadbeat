from contextlib import asynccontextmanager

from fastapi import FastAPI
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from sqlmodel import Session

from app.db import engine, init_db
from app.limiter import limiter
from app.routers import auth, leaderboard, problems, submissions, user
from app.services.leaderboard import leaderboard_cache


@asynccontextmanager
async def lifespan(app: FastAPI):
  init_db()
  with Session(engine) as session:
    leaderboard_cache.warm_up(session)
  yield


app = FastAPI(title="MonadBeat", lifespan=lifespan)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.include_router(auth.router)
app.include_router(user.router)
app.include_router(problems.router)
app.include_router(submissions.router)
app.include_router(leaderboard.router)


@app.get("/")
def read_root():
  return {"name": "MonadBeat"}
