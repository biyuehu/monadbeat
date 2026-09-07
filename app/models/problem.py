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


class Problem(SQLModel, table=True):
  id: int | None = SQLField(default=None, primary_key=True)
  slug: str = SQLField(unique=True, index=True)
  title: str
  difficulty: int
  problem_type: str
  category: list[str] = SQLField(sa_column=Column(ARRAY(String)))
  remark: str | None = None
  is_published: bool = False
  judge_config_raw: dict = SQLField(sa_column=Column("judge_config", JSON))

  @property
  def judge_config(self) -> JudgeConfig:
    return TypeAdapter(JudgeConfig).validate_python(self.judge_config_raw)

  @judge_config.setter
  def judge_config(self, value: JudgeConfig) -> None:
    self.judge_config_raw = value.model_dump()
