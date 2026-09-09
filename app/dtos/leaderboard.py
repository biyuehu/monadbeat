from pydantic import BaseModel


class LeaderboardItem(BaseModel):
  rank: int
  username: str
  avatar_url: str | None
  score: float
  solved_count: int


class LeaderboardResponse(BaseModel):
  items: list[LeaderboardItem]  # TODO
