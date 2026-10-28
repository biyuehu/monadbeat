import re
import secrets
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

# Pattern to detect common bottom / cheat values
_BOTTOM_PATTERN = re.compile(r"\b(undefined|error)\b")


def _scrub_infer_error(raw_error: str, suffix: str) -> str:
  # Check if there is a syntax or scope error directly on user code
  if "Not in scope:" in raw_error or "parse error" in raw_error:
    return raw_error.replace(f"_{suffix}", "")

  # If error occurred on internal check1 / check2 assertions or internal signatures, mask the leak
  for line in raw_error.splitlines():
    if (
      f"check1_{suffix}" in line
      or f"check2_{suffix}" in line
      or f"TargetSig_{suffix}" in line
      or f"CorrectSig_{suffix}" in line
    ):
      return (
        "Type mismatch: The provided type signature does not match the expected type."
      )

  # Fallback: remove suffix and mask Actual: if present
  masked_lines: list[str] = []
  for line in raw_error.splitlines():
    if "Actual:" in line:
      indent = len(line) - len(line.lstrip())
      masked_lines.append(" " * indent + "Actual: <concealed (target type)>")
    elif "Probable cause:" in line:
      continue
    else:
      masked_lines.append(line.replace(f"_{suffix}", ""))
  return "\n".join(masked_lines)


def judge_infer_type(config: InferTypeConfig, user_answer: str) -> JudgeResult:
  rand = secrets.token_hex(4)
  scaffold = config.scaffold

  # Add random suffix to internal identifiers to prevent user from directly submitting internal names
  internal_names = ("CorrectSig", "TargetSig", "check1", "check2")
  for name in internal_names:
    scaffold = re.sub(rf"\b{name}\b", f"{name}_{rand}", scaffold)

  code = scaffold.replace("{{USER_CODE}}", user_answer)
  match ghc_typecheck(code):
    case None:
      return Correct()
    case detail:
      return Wrong(_scrub_infer_error(detail, rand))


def judge_find_function(config: FindFunctionConfig, user_answer: str) -> JudgeResult:
  # Reject cheating with bottom values (undefined / error)
  if _BOTTOM_PATTERN.search(user_answer):
    return Wrong("Submission contains invalid bottom value (undefined/error).")

  rand = secrets.token_hex(4)
  scaffold = config.scaffold
  for name in ("target", "check1", "check2"):
    scaffold = re.sub(rf"\b{name}\b", f"{name}_{rand}", scaffold)

  code = scaffold.replace("{{USER_CODE}}", user_answer)
  match ghc_typecheck(code):
    case None:
      return Correct()
    case detail:
      return Wrong(detail.replace(f"_{rand}", ""))


def multiple_choice(config: PredictBehaviorConfig, user_answer: str) -> JudgeResult:
  return Correct() if str(user_answer) == str(config.correct_index) else Incorrect()


def judge(config: JudgeConfig, user_answer: str) -> JudgeResult:
  match config.problem_type:
    case "infer_type":
      return judge_infer_type(config, user_answer)
    case "find_function":
      return judge_find_function(config, user_answer)
    case "predict_behavior":
      return multiple_choice(config, user_answer)
