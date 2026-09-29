from fastapi import APIRouter, Depends
from sqlmodel import Session

from app.config import settings
from app.db import get_session
from app.dtos.leaderboard import LeaderboardItem, LeaderboardResponse
from app.services.leaderboard import compute_leaderboard

router = APIRouter(prefix="/leaderboard", tags=["leaderboard"])


@router.get("/")
def get_leaderboard(session: Session = Depends(get_session)) -> LeaderboardResponse:
  entries = compute_leaderboard(session, limit=settings.leaderboard_max_entries)
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