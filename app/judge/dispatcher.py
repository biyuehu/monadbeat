from dataclasses import dataclass

from app.judge.ghc_runner import ghc_typecheck
from app.models.problem import (
  FindFunctionConfig,
  InferTypeConfig,
  JudgeConfig,
  PredictBehaviorConfig,
)


@dataclass
class Correct:
  pass


@dataclass
class Incorrect:
  pass


@dataclass
class Wrong:
  detail: str


JudgeResult = Correct | Incorrect | Wrong


def type_check_only(
  config: InferTypeConfig | FindFunctionConfig, user_answer: str
) -> JudgeResult:
  match ghc_typecheck(config.scaffold.replace("{{USER_CODE}}", user_answer)):
    case None:
      return Correct()
    case detail:
      return Wrong(detail)


def multiple_choice(config: PredictBehaviorConfig, user_answer: str) -> JudgeResult:
  return Correct() if str(user_answer) == str(config.correct_index) else Incorrect()


JUDGE_HANDLERS = {
  "type_check_only": type_check_only,
  "multiple_choice": multiple_choice,
}


def judge(config: JudgeConfig, user_answer: str) -> JudgeResult:
  match config.problem_type:
    case "infer_type":
      return type_check_only(config, user_answer)
    case "find_function":
      return type_check_only(config, user_answer)
    case "predict_behavior":
      return multiple_choice(config, user_answer)
    case "satisfy_law":
      raise NotImplementedError
