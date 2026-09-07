from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.db import init_db
from app.routers import problems, submissions


@asynccontextmanager
async def lifespan(app: FastAPI):
  init_db()
  yield
  app.state.db.close()


app = FastAPI(title="MonadBeat", lifespan=lifespan)


app.include_router(problems.router)
app.include_router(submissions.router)


@app.get("/")
def read_root():
  return {"name": "MonadBeat"}
