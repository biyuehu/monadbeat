from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, func, select

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
  ProblemCreate,
  ProblemUpdate,
  UserAdminItem,
)
from app.dtos.problem import ProblemDetailResponse
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
  session: Session = Depends(get_session),
  _: User = Depends(require_admin),
) -> list[ProblemAdminItem]:
  problems = session.exec(select(Problem)).all()
  return [_problem_item(p) for p in problems]


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
) -> ProblemDetailResponse:
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
  return problem.to_detail_response()


@router.put("/problems/{slug}")
def update_problem(
  slug: str,
  body: ProblemUpdate,
  session: Session = Depends(get_session),
  _: User = Depends(require_admin),
) -> ProblemDetailResponse:
  problem = session.exec(select(Problem).where(Problem.slug == slug)).first()
  if problem is None:
    raise HTTPException(status_code=404, detail="Problem not found")

  if body.judge_config is not None:
    problem.judge_config_raw = body.judge_config.model_dump()
    problem.problem_type = body.judge_config.problem_type
  if body.title is not None:
    problem.title = body.title
  if body.difficulty is not None:
    problem.difficulty = body.difficulty
  if body.category is not None:
    problem.category = body.category
  if body.remark is not None:
    problem.remark = body.remark
  if body.is_published is not None:
    problem.is_published = body.is_published

  session.add(problem)
  session.commit()
  session.refresh(problem)
  return problem.to_detail_response()


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
  count = session.exec(
    select(func.count())
    .select_from(Submission)
    .where(Submission.problem_id == problem.id)
  ).one()
  if count > 0:
    raise HTTPException(
      status_code=409,
      detail=f"Cannot delete: {count} submission(s) reference this problem",
    )
  session.delete(problem)
  session.commit()


@router.get("/users")
def list_users(
  session: Session = Depends(get_session),
  _: User = Depends(require_admin),
) -> list[UserAdminItem]:
  users = session.exec(select(User)).all()
  return [_user_item(u) for u in users]


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
