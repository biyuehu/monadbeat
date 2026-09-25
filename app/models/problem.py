from typing import Annotated, Literal

from pydantic import BaseModel, Field, TypeAdapter
from sqlalchemy import ARRAY, JSON, Column, String
from sqlmodel import Field as SQLField
from sqlmodel import SQLModel


class InferTypeConfig(BaseModel):
  problem_type: Literal["infer_type"] = "infer_type"
  scaffold: str
  display_snippet: str


class FindFunctionConfig(BaseModel):
  problem_type: Literal["find_function"] = "find_function"
  scaffold: str
  display_snippet: str


class PredictBehaviorConfig(BaseModel):
  problem_type: Literal["predict_behavior"] = "predict_behavior"
  display_code: str
  options: list[str]
  correct_index: int


class SatisfyLawConfig(BaseModel):
  problem_type: Literal["satisfy_law"] = "satisfy_law"
  scaffold: str
  display_snippet: str
  success_marker: str = "PASS"
  time_limit_sec: int = 10
  memory_limit_mb: int = 200


JudgeConfig = Annotated[
  InferTypeConfig | FindFunctionConfig | PredictBehaviorConfig | SatisfyLawConfig,
  Field(discriminator="problem_type"),
]


def _to_display(config: JudgeConfig):
  from app.dtos.problem import ChoiceDisplay, TextDisplay

  match config:
    case InferTypeConfig(display_snippet=s) | FindFunctionConfig(display_snippet=s):
      return TextDisplay(problem_type=config.problem_type, code=s)
    case PredictBehaviorConfig(display_code=c, options=opts):
      return ChoiceDisplay(problem_type=config.problem_type, code=c, options=opts)
    case SatisfyLawConfig():
      raise NotImplementedError("satisfy_law display is not implemented yet")


class Problem(SQLModel, table=True):
  id: int | None = SQLField(default=None, primary_key=True)
  slug: str = SQLField(unique=True, index=True)
  title: str
  difficulty: int
  problem_type: str
  category: list[str] = SQLField(sa_column=Column(ARRAY(String)))
  remark: str | None
  is_published: bool = False
  judge_config_raw: dict = SQLField(sa_column=Column("judge_config", JSON))

  @property
  def judge_config(self) -> JudgeConfig:
    return TypeAdapter(JudgeConfig).validate_python(self.judge_config_raw)

  @judge_config.setter
  def judge_config(self, value: JudgeConfig) -> None:
    self.judge_config_raw = value.model_dump()

  def to_detail_response(self):
    from app.dtos.problem import ProblemDetailResponse

    return ProblemDetailResponse(
      slug=self.slug,
      title=self.title,
      difficulty=self.difficulty,
      problem_type=self.problem_type,
      category=self.category,
      remark=self.remark,
      is_published=self.is_published,
      display=_to_display(self.judge_config),
    )
