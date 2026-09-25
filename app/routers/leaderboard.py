from fastapi import APIRouter

from app.dtos.leaderboard import LeaderboardItem, LeaderboardResponse
from app.services.leaderboard import leaderboard_cache

router = APIRouter(prefix="/leaderboard", tags=["leaderboard"])


@router.get("/")
def get_leaderboard(limit: int = 50) -> LeaderboardResponse:
  entries = leaderboard_cache.top(limit)
  return LeaderboardResponse(
    items=[
      LeaderboardItem(
        rank=i + 1,
        username=e.username,
        avatar_url=e.avatar_url,
        score=e.score,
        solved_count=e.solved_count,
      )
      for i, e in enumerate(entries)
    ]
  )