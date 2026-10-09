from datetime import UTC, datetime

from sqlmodel import Session, select

from app.models.ban import Ban


def _now() -> datetime:
  return datetime.now(UTC).replace(tzinfo=None)


def active_ban(session: Session, user_id: int) -> Ban | None:
  now = _now()
  rows = session.exec(select(Ban).where(Ban.user_id == user_id)).all()
  for ban in rows:
    if ban.lifted_at is not None:
      continue
    if ban.expires_at is not None and ban.expires_at <= now:
      continue
    return ban
  return None
