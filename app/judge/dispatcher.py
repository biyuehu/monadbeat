from app.judge.ghc_runner import ghc_typecheck


def type_annotation(judge_config: dict, user_answer: str) -> bool:
  scaffold = judge_config["scaffold"]
  full_code = scaffold.replace("{{USER_CODE}}", user_answer)
  return ghc_typecheck(full_code)


def type_check_only(judge_config: dict, user_answer: str) -> bool:
  scaffold = judge_config["scaffold"]
  full_code = scaffold.replace("{{USER_CODE}}", user_answer)
  return ghc_typecheck(
    full_code
  )  # TODO: 使用ADT建模 Correct | Incorrect | Wrong String


def multiple_choice(judge_config: dict, user_answer: str) -> bool:
  return str(user_answer) == str(judge_config["correct_index"])


JUDGE_HANDLERS = {
  "type_annotation": type_annotation,
  "type_check_only": type_check_only,
  "multiple_choice": multiple_choice,
  # quickcheck / resource_bounded: 后续接入沙箱执行时再补
}


def judge(problem_judge_config: dict, user_answer: str) -> bool:
  check_method = problem_judge_config["check_method"]
  handler = JUDGE_HANDLERS.get(check_method)
  if handler is None:
    raise ValueError(f"未实现的 check_method: {check_method}")
  return handler(problem_judge_config, user_answer)
