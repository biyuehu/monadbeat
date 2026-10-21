from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, col, func, select

from app.auth.dependencies import get_current_user_optional
from app.db import get_session
from app.dtos.problem import ProblemDetailResponse, ProblemListItem, ProblemListResponse
from app.models.problem import Problem
from app.models.user import User

router = APIRouter(prefix="/problems", tags=["problems"])


@router.get("/")
def list_problems(
  page: int = 1,
  page_size: int = 20,
  search: str | None = None,
  problem_types: str | None = None,
  session: Session = Depends(get_session),
) -> ProblemListResponse:
  base_query = select(Problem).where(Problem.is_published == True)

  if search:
    base_query = base_query.where(col(Problem.title).ilike(f"%{search.strip()}%"))

  if problem_types:
    types = [t.strip() for t in problem_types.split(",") if t.strip()]
    if types:
      base_query = base_query.where(col(Problem.problem_type).in_(types))

  total = session.exec(select(func.count()).select_from(base_query.subquery())).one()

  problems = session.exec(
    base_query.order_by(col(Problem.id).asc())
    .offset((page - 1) * page_size)
    .limit(page_size)
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
  slug: str,
  user: User | None = Depends(get_current_user_optional),
  session: Session = Depends(get_session),
) -> ProblemDetailResponse:
  query = select(Problem).where(Problem.slug == slug)
  if user is None or not user.is_admin:
    query = query.where(Problem.is_published == True)

  problem = session.exec(query).first()
  if problem is None:
    raise HTTPException(status_code=404, detail="Problem not found")
  return problem.to_detail_response()
