DIFFICULTY_SCORE = {1: 10, 2: 20, 3: 30, 4: 40, 5: 50}

PROBLEM_TYPE_MULTIPLIER = {
  "infer_type": 1.0,
  "find_function": 1.0,
  "predict_behavior": 0.5,
  "satisfy_law": 1.5,
  "fix_laziness": 1.5,
}

# FIRST_BLOOD_BONUS = 20


def problem_base_score(difficulty: int, problem_type: str) -> float:
  if difficulty not in DIFFICULTY_SCORE:
    raise ValueError(f"Unknown difficulty value: {difficulty!r}, should be 1~5")
  if problem_type not in PROBLEM_TYPE_MULTIPLIER:
    raise ValueError(f"Unknown problem_type value: {problem_type!r}")
  return DIFFICULTY_SCORE[difficulty] * PROBLEM_TYPE_MULTIPLIER[problem_type]


# Todo: trying count scores 1: *1.5 3: *1 _: *0.7
