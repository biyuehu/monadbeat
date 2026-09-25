from pydantic import BaseModel

from app.dtos.pagination import PaginatedResponse


class LeaderboardItem(BaseModel):
  rank: int
  username: str
  avatar_url: str | None
  score: float
  solved_count: int


LeaderboardResponse = PaginatedResponse[LeaderboardItem]