from fastapi import APIRouter

from app.dtos.leaderboard import LeaderboardItem, LeaderboardResponse
from app.services.leaderboard import leaderboard_cache

router = APIRouter(prefix="/leaderboard", tags=["leaderboard"])


@router.get("/")
def get_leaderboard(page: int = 1, page_size: int = 50) -> LeaderboardResponse:
  all_entries = leaderboard_cache.top(limit=10_000)
  total = len(all_entries)
  start = (page - 1) * page_size
  page_entries = all_entries[start : start + page_size]

  return LeaderboardResponse(
    items=[
      LeaderboardItem(
        rank=start + i + 1,
        username=e.username,
        avatar_url=e.avatar_url,
        score=e.score,
        solved_count=e.solved_count,
      )
      for i, e in enumerate(page_entries)
    ],
    total=total,
    page=page,
    page_size=page_size,
  )