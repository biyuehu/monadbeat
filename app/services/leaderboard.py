from dataclasses import dataclass
from threading import Lock

from sqlmodel import Session, select

from app.models.problem import Problem
from app.models.submission import Submission
from app.models.user import User
from app.services.scoring import problem_base_score


@dataclass
class LeaderboardEntry:
  user_id: int
  username: str
  avatar_url: str | None
  score: float
  solved_count: int


class LeaderboardCache:
  def __init__(self) -> None:
    self._entries: dict[int, LeaderboardEntry] = {}
    self._lock = Lock()

  def warm_up(self, session: Session) -> None:
    with self._lock:
      self._entries = self._compute_all(session)

  def refresh_user(self, session: Session, user_id: int) -> None:
    entry = self._compute_one(session, user_id)
    with self._lock:
      if entry is not None:
        self._entries[user_id] = entry
      else:
        self._entries.pop(user_id, None)

  def top(self, limit: int = 50) -> list[LeaderboardEntry]:
    with self._lock:
      return sorted(self._entries.values(), key=lambda e: -e.score)[:limit]

  # def _first_blood_counts(self, session: Session) -> Counter[int]:
  #   rows = session.exec(
  #     select(Submission.problem_id, Submission.user_id, Submission.submitted_at)
  #     .where(Submission.is_correct == True)
  #     .order_by(Submission.problem_id, Submission.submitted_at)
  #   ).all()

  #   first_blood_by_problem: dict[int, int] = {}
  #   for problem_id, user_id, _submitted_at in rows:
  #     if problem_id not in first_blood_by_problem:
  #       first_blood_by_problem[problem_id] = user_id

  #   return Counter(first_blood_by_problem.values())

  def _solved_problems_by_user(
    self, session: Session
  ) -> dict[int, set[tuple[int, int, str]]]:
    rows = session.exec(
      select(
        Submission.user_id,
        Submission.problem_id,
        Problem.difficulty,
        Problem.problem_type,
      )
      .join(Problem)
      .where(Submission.is_correct == True)
    ).all()

    result: dict[int, set[tuple[int, int, str]]] = {}
    for user_id, problem_id, difficulty, problem_type in rows:
      result.setdefault(user_id, set()).add((problem_id, difficulty, problem_type))
    return result

  def _build_entry(
    self,
    user: User,
    solved: set[tuple[int, int, str]],
    # first_blood_counts: Counter[int],
  ) -> LeaderboardEntry:
    score = sum(
      problem_base_score(difficulty, ptype) for _pid, difficulty, ptype in solved
    )
    assert user.id is not None
    # score += first_blood_counts.get(user.id, 0) * FIRST_BLOOD_BONUS
    return LeaderboardEntry(
      user_id=user.id,
      username=user.username,
      avatar_url=user.avatar_url,
      score=score,
      solved_count=len(solved),
    )

  def _compute_all(self, session: Session) -> dict[int, LeaderboardEntry]:
    solved_by_user = self._solved_problems_by_user(session)
    # first_blood_counts = self._first_blood_counts(session)

    entries: dict[int, LeaderboardEntry] = {}
    for user_id, solved in solved_by_user.items():
      user = session.get(User, user_id)
      if user is None:
        continue
      entries[user_id] = self._build_entry(user, solved)
    return entries

  def _compute_one(self, session: Session, user_id: int) -> LeaderboardEntry | None:
    user = session.get(User, user_id)
    if user is None:
      return None

    rows = session.exec(
      select(Submission.problem_id, Problem.difficulty, Problem.problem_type)
      .join(Problem)
      .where(Submission.user_id == user_id)
      .where(Submission.is_correct == True)
    ).all()
    solved = {(pid, diff, ptype) for pid, diff, ptype in rows}

    if not solved:
      return None

    # first_blood_counts = self._first_blood_counts(session)
    return self._build_entry(user, solved)


leaderboard_cache = LeaderboardCache()
