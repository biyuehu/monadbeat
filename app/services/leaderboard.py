from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Any, cast

from sqlalchemy import case, func, select
from sqlmodel import Session

from app.models.ban import Ban
from app.models.problem import Problem
from app.models.submission import Submission
from app.models.user import User
from app.services.scoring import DIFFICULTY_SCORE, PROBLEM_TYPE_MULTIPLIER


@dataclass
class LeaderboardEntry:
  user_id: int
  username: str
  avatar_url: str | None
  score: float
  solved_count: int


def _col(attr: Any) -> Any:
  return cast(Any, attr)


def compute_leaderboard(session: Session, limit: int) -> list[LeaderboardEntry]:
  now = datetime.now(UTC).replace(tzinfo=None)

  # Step 1: Chronologically rank all submissions for published problems.
  sub_ranked = (
    select(
      _col(Submission.user_id).label("user_id"),
      _col(Submission.problem_id).label("problem_id"),
      _col(Submission.is_correct).label("is_correct"),
      func.row_number()
      .over(
        partition_by=(_col(Submission.user_id), _col(Submission.problem_id)),
        order_by=_col(Submission.submitted_at).asc(),
      )
      .label("attempt_number"),
    )
    .join(Problem, _col(Submission.problem_id) == _col(Problem.id))
    .where(_col(Problem.is_published) == True)
    .subquery()
  )

  # Step 2: Find the attempt count at which the user first correctly solved the problem.
  first_solve = (
    select(
      sub_ranked.c.user_id.label("user_id"),
      sub_ranked.c.problem_id.label("problem_id"),
      func.min(sub_ranked.c.attempt_number).label("attempts_to_solve"),
    )
    .where(sub_ranked.c.is_correct == True)
    .group_by(sub_ranked.c.user_id, sub_ranked.c.problem_id)
    .subquery()
  )

  # Step 3: Join with published problem metadata.
  solved = (
    select(
      first_solve.c.user_id.label("user_id"),
      first_solve.c.problem_id.label("problem_id"),
      first_solve.c.attempts_to_solve.label("attempts_to_solve"),
      _col(Problem.difficulty).label("difficulty"),
      _col(Problem.problem_type).label("problem_type"),
    )
    .join(Problem, first_solve.c.problem_id == _col(Problem.id))
    .where(_col(Problem.is_published) == True)
    .where(_col(Problem.difficulty).between(1, 5))
    .where(_col(Problem.problem_type).in_(list(PROBLEM_TYPE_MULTIPLIER.keys())))
    .subquery()
  )

  # Multiplier: 1st try = 1.5, <= 3 tries = 1.0, > 3 tries = 0.5
  attempt_factor = case(
    (solved.c.attempts_to_solve <= 1, 1.5),
    (solved.c.attempts_to_solve <= 3, 1.0),
    else_=0.5,
  )

  per_problem_score = (
    case(
      DIFFICULTY_SCORE,
      value=solved.c.difficulty,
      else_=0,
    )
    * case(
      PROBLEM_TYPE_MULTIPLIER,
      value=solved.c.problem_type,
      else_=0.0,
    )
    * attempt_factor
  )

  total_score = func.sum(per_problem_score).label("score")

  # Subquery of currently banned user IDs (not lifted, and not expired)
  active_banned_user_ids = (
    select(_col(Ban.user_id))
    .where(_col(Ban.lifted_at).is_(None))
    .where((_col(Ban.expires_at).is_(None)) | (_col(Ban.expires_at) > now))
    .distinct()
  )

  stmt = (
    select(
      solved.c.user_id,
      _col(User.username),
      _col(User.avatar_url),
      total_score,
      func.count().label("solved_count"),
    )
    .join(User, solved.c.user_id == _col(User.id))
    .where(_col(User.id).not_in(active_banned_user_ids))
    .group_by(solved.c.user_id, _col(User.username), _col(User.avatar_url))
    .order_by(total_score.desc(), solved.c.user_id.asc())
    .limit(limit)
  )

  rows = session.execute(stmt).all()
  return [
    LeaderboardEntry(
      user_id=user_id,
      username=username,
      avatar_url=avatar_url,
      score=float(score),
      solved_count=int(solved_count),
    )
    for user_id, username, avatar_url, score, solved_count in rows
  ]
