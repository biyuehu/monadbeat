from typing import Annotated, Literal

from pydantic import BaseModel, Field


class TextDisplay(BaseModel):
  problem_type: Literal["infer_type", "find_function"]
  code: str


class ChoiceDisplay(BaseModel):
  problem_type: Literal["predict_behavior"]
  code: str
  options: list[str]


Display = Annotated[
  TextDisplay | ChoiceDisplay,
  Field(discriminator="problem_type"),
]


class ProblemDetailResponse(BaseModel):
  slug: str
  title: str
  difficulty: int
  problem_type: str
  category: list[str]
  remark: str | None
  is_published: bool = False
  display: Display


class ProblemListItem(BaseModel):
  slug: str
  title: str
  difficulty: int
  problem_type: str
  category: list[str]