from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, col, func, select

from app.auth.dependencies import (
  is_superadmin,
  require_admin,
  require_superadmin,
  role_of,
)
from app.config import settings
from app.db import get_session
from app.dtos.admin import (
  BanCreate,
  BanItem,
  ProblemAdminDetail,
  ProblemAdminItem,
  ProblemAdminListResponse,
  ProblemCreate,
  ProblemUpdate,
  SubmissionAdminItem,
  SubmissionAdminListResponse,
  UserAdminItem,
  UserAdminListResponse,
)
from app.models.ban import Ban
from app.models.problem import Problem
from app.models.submission import Submission
from app.models.user import User
from app.services.ban import active_ban

router = APIRouter(prefix="/admin", tags=["admin"])


def _user_item(user: User) -> UserAdminItem:
  return UserAdminItem(
    username=user.username,
    avatar_url=user.avatar_url,
    role=role_of(user),
    created_at=user.created_at,
  )


def _problem_item(problem: Problem) -> ProblemAdminItem:
  return ProblemAdminItem(
    slug=problem.slug,
    title=problem.title,
    difficulty=problem.difficulty,
    problem_type=problem.problem_type,
    category=problem.category,
    is_published=problem.is_published,
  )


@router.get("/problems")
def list_all_problems(
  page: int = Query(default=1, ge=1),
  page_size: int = Query(default=20, ge=1, le=100),
  session: Session = Depends(get_session),
  _: User = Depends(require_admin),
) -> ProblemAdminListResponse:
  base_query = select(Problem)
  total = session.exec(select(func.count()).select_from(base_query.subquery())).one()
  problems = session.exec(
    base_query.order_by(col(Problem.id).asc())
    .offset((page - 1) * page_size)
    .limit(page_size)
  ).all()
  return ProblemAdminListResponse(
    items=[_problem_item(p) for p in problems],
    total=total,
    page=page,
    page_size=page_size,
  )


@router.get("/problems/{slug}")
def get_problem_for_edit(
  slug: str,
  session: Session = Depends(get_session),
  _: User = Depends(require_admin),
) -> ProblemAdminDetail:
  problem = session.exec(select(Problem).where(Problem.slug == slug)).first()
  if problem is None:
    raise HTTPException(status_code=404, detail="Problem not found")
  return ProblemAdminDetail(
    slug=problem.slug,
    title=problem.title,
    difficulty=problem.difficulty,
    category=problem.category,
    remark=problem.remark,
    is_published=problem.is_published,
    judge_config=problem.judge_config,
  )


@router.post("/problems")
def create_problem(
  body: ProblemCreate,
  session: Session = Depends(get_session),
  _: User = Depends(require_admin),
) -> ProblemAdminDetail:
  exists = session.exec(select(Problem).where(Problem.slug == body.slug)).first()
  if exists is not None:
    raise HTTPException(status_code=409, detail="slug already exists")
  problem = Problem(
    slug=body.slug,
    title=body.title,
    difficulty=body.difficulty,
    problem_type=body.judge_config.problem_type,
    category=body.category,
    remark=body.remark,
    is_published=body.is_published,
    judge_config_raw=body.judge_config.model_dump(),
  )
  session.add(problem)
  session.commit()
  session.refresh(problem)
  return ProblemAdminDetail(
    slug=problem.slug,
    title=problem.title,
    difficulty=problem.difficulty,
    category=problem.category,
    remark=problem.remark,
    is_published=problem.is_published,
    judge_config=problem.judge_config,
  )


@router.put("/problems/{slug}")
def update_problem(
  slug: str,
  body: ProblemUpdate,
  session: Session = Depends(get_session),
  _: User = Depends(require_admin),
) -> ProblemAdminDetail:
  problem = session.exec(select(Problem).where(Problem.slug == slug)).first()
  if problem is None:
    raise HTTPException(status_code=404, detail="Problem not found")

  # Use model_fields_set to accurately distinguish omitted fields from explicit None/empty values
  fields_set = body.model_fields_set

  if "judge_config" in fields_set and body.judge_config is not None:
    problem.judge_config_raw = body.judge_config.model_dump()
    problem.problem_type = body.judge_config.problem_type
  if "title" in fields_set and body.title is not None:
    problem.title = body.title
  if "difficulty" in fields_set and body.difficulty is not None:
    problem.difficulty = body.difficulty
  if "category" in fields_set and body.category is not None:
    problem.category = body.category
  if "remark" in fields_set:
    problem.remark = body.remark
  if "is_published" in fields_set and body.is_published is not None:
    problem.is_published = body.is_published

  session.add(problem)
  session.commit()
  session.refresh(problem)
  return ProblemAdminDetail(
    slug=problem.slug,
    title=problem.title,
    difficulty=problem.difficulty,
    category=problem.category,
    remark=problem.remark,
    is_published=problem.is_published,
    judge_config=problem.judge_config,
  )


@router.delete("/problems/{slug}")
def delete_problem(
  slug: str,
  session: Session = Depends(get_session),
  _: User = Depends(require_admin),
) -> None:
  problem = session.exec(select(Problem).where(Problem.slug == slug)).first()
  if problem is None:
    raise HTTPException(status_code=404, detail="Problem not found")
  assert problem.id is not None

  # Delete all associated submissions before deleting the problem
  submissions = session.exec(
    select(Submission).where(Submission.problem_id == problem.id)
  ).all()
  for sub in submissions:
    session.delete(sub)

  session.delete(problem)
  session.commit()


@router.get("/users")
def list_users(
  page: int = Query(default=1, ge=1),
  page_size: int = Query(default=20, ge=1, le=100),
  session: Session = Depends(get_session),
  _: User = Depends(require_admin),
) -> UserAdminListResponse:
  base_query = select(User)
  total = session.exec(select(func.count()).select_from(base_query.subquery())).one()
  users = session.exec(
    base_query.order_by(col(User.id).asc())
    .offset((page - 1) * page_size)
    .limit(page_size)
  ).all()
  return UserAdminListResponse(
    items=[_user_item(u) for u in users],
    total=total,
    page=page,
    page_size=page_size,
  )


def _ban_item(ban: Ban, username: str) -> BanItem:
  assert ban.id is not None
  return BanItem(
    id=ban.id,
    username=username,
    reason=ban.reason,
    banned_at=ban.banned_at,
    expires_at=ban.expires_at,
    lifted_at=ban.lifted_at,
    is_active=ban.lifted_at is None,
  )


@router.get("/bans")
def list_bans(
  session: Session = Depends(get_session),
  _: User = Depends(require_admin),
) -> list[BanItem]:
  bans = session.exec(select(Ban)).all()
  result: list[BanItem] = []
  for ban in bans:
    target = session.get(User, ban.user_id)
    result.append(_ban_item(ban, target.username if target else "(deleted)"))
  return result


@router.post("/users/{username}/ban")
def ban_user(
  username: str,
  body: BanCreate,
  session: Session = Depends(get_session),
  actor: User = Depends(require_admin),
) -> BanItem:
  target = session.exec(select(User).where(User.username == username)).first()
  if target is None:
    raise HTTPException(status_code=404, detail="User not found")
  assert target.id is not None
  assert actor.id is not None
  if is_superadmin(target):
    raise HTTPException(status_code=403, detail="Cannot ban the superadmin")
  if is_superadmin(actor) is False and target.is_admin:
    raise HTTPException(status_code=403, detail="Admins cannot ban other admins")
  if target.id == actor.id:
    raise HTTPException(status_code=403, detail="Cannot ban yourself")
  if active_ban(session, target.id) is not None:
    raise HTTPException(status_code=409, detail="User is already banned")

  ban = Ban(
    user_id=target.id,
    reason=body.reason,
    banned_by=actor.id,
    expires_at=body.expires_at,
  )
  session.add(ban)
  session.commit()
  session.refresh(ban)
  return _ban_item(ban, target.username)


@router.put("/bans/{ban_id}/lift")
def lift_ban(
  ban_id: int,
  session: Session = Depends(get_session),
  actor: User = Depends(require_admin),
) -> BanItem:
  ban = session.get(Ban, ban_id)
  if ban is None:
    raise HTTPException(status_code=404, detail="Ban not found")
  if ban.lifted_at is not None:
    raise HTTPException(status_code=409, detail="Ban already lifted")
  target = session.get(User, ban.user_id)
  assert actor.id is not None
  ban.lifted_at = datetime.now(UTC).replace(tzinfo=None)
  ban.lifted_by = actor.id
  session.add(ban)
  session.commit()
  session.refresh(ban)
  return _ban_item(ban, target.username if target else "(deleted)")


@router.post("/users/{username}/promote")
def promote_user(
  username: str,
  session: Session = Depends(get_session),
  _: User = Depends(require_superadmin),
) -> UserAdminItem:
  target = session.exec(select(User).where(User.username == username)).first()
  if target is None:
    raise HTTPException(status_code=404, detail="User not found")
  target.is_admin = True
  session.add(target)
  session.commit()
  session.refresh(target)
  return _user_item(target)


@router.post("/users/{username}/demote")
def demote_user(
  username: str,
  session: Session = Depends(get_session),
  _: User = Depends(require_superadmin),
) -> UserAdminItem:
  target = session.exec(select(User).where(User.username == username)).first()
  if target is None:
    raise HTTPException(status_code=404, detail="User not found")
  if (
    settings.superadmin_github_id != ""
    and target.github_id == settings.superadmin_github_id
  ):
    raise HTTPException(
      status_code=403, detail="Cannot demote the env-pinned superadmin"
    )
  target.is_admin = False
  session.add(target)
  session.commit()
  session.refresh(target)
  return _user_item(target)


@router.get("/submissions")
def list_all_submissions(
  username: str | None = None,
  problem_slug: str | None = None,
  is_correct: bool | None = None,
  page: int = Query(default=1, ge=1),
  page_size: int = Query(default=20, ge=1, le=100),
  session: Session = Depends(get_session),
  _: User = Depends(require_admin),
) -> SubmissionAdminListResponse:
  base_query = (
    select(
      Submission,
      User,
      Problem,
    )
    .join(User, col(Submission.user_id) == col(User.id))
    .join(Problem, col(Submission.problem_id) == col(Problem.id))
    .order_by(col(Submission.submitted_at).desc())
  )

  if username and username.strip():
    base_query = base_query.where(col(User.username).ilike(f"%{username.strip()}%"))

  if problem_slug and problem_slug.strip():
    base_query = base_query.where(col(Problem.slug).ilike(f"%{problem_slug.strip()}%"))

  if is_correct is not None:
    base_query = base_query.where(Submission.is_correct == is_correct)

  total = session.exec(select(func.count()).select_from(base_query.subquery())).one()

  items = []
  for sub, user, prob in session.exec(
    base_query.offset((page - 1) * page_size).limit(page_size)
  ).all():
    assert sub.id is not None
    items.append(
      SubmissionAdminItem(
        id=sub.id,
        username=user.username,
        user_avatar=user.avatar_url,
        problem_slug=prob.slug,
        problem_title=prob.title,
        user_answer=sub.user_answer,
        is_correct=sub.is_correct,
        judge_detail=sub.judge_detail,
        submitted_at=sub.submitted_at,
      )
    )

  return SubmissionAdminListResponse(
    items=items,
    total=total,
    page=page,
    page_size=page_size,
  )
