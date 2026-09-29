from typing import Annotated, Literal

from pydantic import BaseModel, Field, TypeAdapter, model_validator
from sqlalchemy import ARRAY, JSON, CheckConstraint, Column, String
from sqlmodel import Field as SQLField
from sqlmodel import SQLModel

PROBLEM_TYPES: tuple[str, ...] = ("infer_type", "find_function", "predict_behavior")


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


# class SatisfyLawConfig(BaseModel):
#   problem_type: Literal["satisfy_law"] = "satisfy_law"
#   scaffold: str
#   display_snippet: str
#   success_marker: str = "PASS"
#   time_limit_sec: int = 10
#   memory_limit_mb: int = 200


JudgeConfig = Annotated[
  InferTypeConfig | FindFunctionConfig | PredictBehaviorConfig,
  # | SatisfyLawConfig
  Field(discriminator="problem_type"),
]


def _to_display(config: JudgeConfig):
  from app.dtos.problem import ChoiceDisplay, TextDisplay

  match config:
    case InferTypeConfig(display_snippet=s) | FindFunctionConfig(display_snippet=s):
      return TextDisplay(problem_type=config.problem_type, code=s)
    case PredictBehaviorConfig(display_code=c, options=opts):
      return ChoiceDisplay(problem_type=config.problem_type, code=c, options=opts)
    # case SatisfyLawConfig():
    #   raise NotImplementedError("satisfy_law display is not implemented yet")


class Problem(SQLModel, table=True):
  __table_args__ = (
    CheckConstraint("difficulty BETWEEN 1 AND 5", name="ck_problem_difficulty"),
    CheckConstraint(
      "problem_type IN ('infer_type', 'find_function', 'predict_behavior')",
      name="ck_problem_type",
    ),
  )

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

  @model_validator(mode="after")
  def _check_consistency(self) -> "Problem":
    config_type = self.judge_config_raw.get("problem_type")
    if self.problem_type != config_type:
      raise ValueError(
        f"problem_type mismatch: column={self.problem_type!r} config={config_type!r}"
      )
    if self.difficulty not in (1, 2, 3, 4, 5):
      raise ValueError(f"difficulty out of range: {self.difficulty!r}")
    return self

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