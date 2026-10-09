from dataclasses import dataclass
from typing import Any, cast

from sqlalchemy import case, func, select
from sqlmodel import Session

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
  # Deduplicate (user, problem) pairs first: a user who submitted the same
  # problem correctly multiple times must only be scored once.
  solved = (
    select(
      _col(Submission.user_id).label("user_id"),
      _col(Submission.problem_id).label("problem_id"),
      _col(Problem.difficulty).label("difficulty"),
      _col(Problem.problem_type).label("problem_type"),
    )
    .join(Problem, _col(Submission.problem_id) == _col(Problem.id))
    .where(_col(Submission.is_correct) == True)
    .where(_col(Problem.difficulty).between(1, 5))
    .where(_col(Problem.problem_type).in_(list(PROBLEM_TYPE_MULTIPLIER.keys())))
    .distinct()
    .subquery()
  )

  per_problem_score = case(
    DIFFICULTY_SCORE,
    value=solved.c.difficulty,
    else_=0,
  ) * case(
    PROBLEM_TYPE_MULTIPLIER,
    value=solved.c.problem_type,
    else_=0.0,
  )

  total_score = func.sum(per_problem_score).label("score")

  stmt = (
    select(
      solved.c.user_id,
      _col(User.username),
      _col(User.avatar_url),
      total_score,
      func.count().label("solved_count"),
    )
    .join(User, solved.c.user_id == _col(User.id))
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
