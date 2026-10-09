from contextlib import asynccontextmanager
from typing import cast

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from starlette.types import ExceptionHandler

from app.config import settings
from app.db import init_db
from app.limiter import limiter
from app.routers import admin, auth, leaderboard, problems, submissions, user


@asynccontextmanager
async def lifespan(app: FastAPI):
  init_db()
  yield


app = FastAPI(title="MonadBeat", lifespan=lifespan)

app.add_middleware(
  CORSMiddleware,
  allow_origins=settings.cors_origins,
  allow_credentials=True,
  allow_methods=["*"],
  allow_headers=["*"],
)

app.state.limiter = limiter
app.add_exception_handler(
  RateLimitExceeded, cast(ExceptionHandler, _rate_limit_exceeded_handler)
)

app.include_router(auth.router)
app.include_router(user.router)
app.include_router(problems.router)
app.include_router(submissions.router)
app.include_router(leaderboard.router)
app.include_router(admin.router)


@app.get("/")
def read_root():
  return {"name": "MonadBeat"}
