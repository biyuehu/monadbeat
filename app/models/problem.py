from sqlalchemy import ARRAY, JSON, Column, String
from sqlmodel import Field, SQLModel


class Problem(SQLModel, table=True):
  id: int | None = Field(default=None, primary_key=True)
  slug: str = Field(unique=True, index=True)
  title: str
  difficulty: int
  problem_type: (
    str  # infer_type | find_function | predict_behavior | satisfy_law | fix_laziness
  )
  category: list[str] = Field(sa_column=Column(ARRAY(String)))
  remark: str | None = None
  judge_config: dict = Field(sa_column=Column(JSON))  # TODO 建模
  is_published: bool = False
