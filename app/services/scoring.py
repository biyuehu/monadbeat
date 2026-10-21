DIFFICULTY_SCORE = {1: 10, 2: 20, 3: 30, 4: 40, 5: 50}

PROBLEM_TYPE_MULTIPLIER = {
  "infer_type": 1.0,
  "find_function": 1.0,
  "predict_behavior": 0.5,
  # "satisfy_law": 1.5,
  # "fix_laziness": 1.5,
}


def attempt_multiplier(attempts: int) -> float:
  """Attempt-based multiplier:

  - 1st attempt correct: 1.5x
  - 2nd or 3rd attempt correct: 1.0x
  - > 3 attempts: 0.5x
  """
  if attempts <= 1:
    return 1.5
  if attempts <= 3:
    return 1.0
  return 0.5


def problem_base_score(difficulty: int, problem_type: str, attempts: int = 1) -> float:
  if difficulty not in DIFFICULTY_SCORE:
    raise ValueError(f"Unknown difficulty value: {difficulty!r}, should be 1~5")
  if problem_type not in PROBLEM_TYPE_MULTIPLIER:
    raise ValueError(f"Unknown problem_type value: {problem_type!r}")
  return (
    DIFFICULTY_SCORE[difficulty]
    * PROBLEM_TYPE_MULTIPLIER[problem_type]
    * attempt_multiplier(attempts)
  )
