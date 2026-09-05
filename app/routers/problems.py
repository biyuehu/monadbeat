from collections.abc import Sequence

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from app.db import get_session
from app.models.problem import Problem

router = APIRouter(prefix="/problems", tags=["problems"])


@router.get("/")
def list_problems(session: Session = Depends(get_session)) -> Sequence[Problem]:
  return (session).exec(select(Problem).where(Problem.is_published == True)).all()


@router.get("/{slug}")
def get_problem(slug: str, session: Session = Depends(get_session)) -> Problem:
  problem = (session).exec(select(Problem).where(Problem.slug == slug)).first()
  if problem is None:
    raise HTTPException(status_code=404, detail="Problem not found")
  return problem
