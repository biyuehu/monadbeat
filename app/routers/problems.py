from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, func, select

from app.db import get_session
from app.dtos.problem import ProblemDetailResponse, ProblemListItem, ProblemListResponse
from app.models.problem import Problem

router = APIRouter(prefix="/problems", tags=["problems"])


@router.get("/")
def list_problems(
  page: int = 1,
  page_size: int = 20,
  session: Session = Depends(get_session),
) -> ProblemListResponse:
  base_query = select(Problem).where(Problem.is_published == True)

  total = session.exec(select(func.count()).select_from(base_query.subquery())).one()

  problems = session.exec(
    base_query.offset((page - 1) * page_size).limit(page_size)
  ).all()

  return ProblemListResponse(
    items=[
      ProblemListItem(
        slug=p.slug,
        title=p.title,
        difficulty=p.difficulty,
        problem_type=p.problem_type,
        category=p.category,
      )
      for p in problems
    ],
    total=total,
    page=page,
    page_size=page_size,
  )


@router.get("/{slug}")
def get_problem(
  slug: str, session: Session = Depends(get_session)
) -> ProblemDetailResponse:
  problem = session.exec(select(Problem).where(Problem.slug == slug)).first()
  if problem is None:
    raise HTTPException(status_code=404, detail="Problem not found")
  return problem.to_detail_response()
