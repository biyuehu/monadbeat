import { Schema } from 'effect'

export const ProblemType = Schema.Literal('infer_type', 'find_function', 'predict_behavior')
export type ProblemType = typeof ProblemType.Type

export const InferTypeConfig = Schema.Struct({
  problem_type: Schema.Literal('infer_type'),
  scaffold: Schema.String,
  display_snippet: Schema.String
})
export type InferTypeConfig = typeof InferTypeConfig.Type

export const FindFunctionConfig = Schema.Struct({
  problem_type: Schema.Literal('find_function'),
  scaffold: Schema.String,
  display_snippet: Schema.String
})
export type FindFunctionConfig = typeof FindFunctionConfig.Type

export const PredictBehaviorConfig = Schema.Struct({
  problem_type: Schema.Literal('predict_behavior'),
  display_code: Schema.String,
  options: Schema.Array(Schema.String),
  correct_index: Schema.Number
})
export type PredictBehaviorConfig = typeof PredictBehaviorConfig.Type

export const JudgeConfig = Schema.Union(InferTypeConfig, FindFunctionConfig, PredictBehaviorConfig)
export type JudgeConfig = typeof JudgeConfig.Type

export const InferTypeProblem = Schema.Struct({
  id: Schema.Number,
  slug: Schema.String,
  title: Schema.String,
  difficulty: Schema.Number,
  problem_type: Schema.Literal('infer_type'),
  category: Schema.Array(Schema.String),
  remark: Schema.NullOr(Schema.String),
  is_published: Schema.Boolean,
  judge_config: InferTypeConfig
})

export const FindFunctionProblem = Schema.Struct({
  id: Schema.Number,
  slug: Schema.String,
  title: Schema.String,
  difficulty: Schema.Number,
  problem_type: Schema.Literal('find_function'),
  category: Schema.Array(Schema.String),
  remark: Schema.NullOr(Schema.String),
  is_published: Schema.Boolean,
  judge_config: FindFunctionConfig
})

export const PredictBehaviorProblem = Schema.Struct({
  id: Schema.Number,
  slug: Schema.String,
  title: Schema.String,
  difficulty: Schema.Number,
  problem_type: Schema.Literal('predict_behavior'),
  category: Schema.Array(Schema.String),
  remark: Schema.NullOr(Schema.String),
  is_published: Schema.Boolean,
  judge_config: PredictBehaviorConfig
})

export const Problem = Schema.Union(InferTypeProblem, FindFunctionProblem, PredictBehaviorProblem)
export type Problem = typeof Problem.Type

export const ProblemFile = Schema.Struct({
  problems: Schema.Array(Problem)
})

export const User = Schema.Struct({
  id: Schema.Number,
  github_id: Schema.String,
  username: Schema.String,
  avatar_url: Schema.NullOr(Schema.String),
  is_admin: Schema.Boolean,
  created_at: Schema.String
})
export type User = typeof User.Type

export const UsersFile = Schema.Struct({
  users: Schema.Array(User)
})

export const ProgressStatus = Schema.Literal('unsolved', 'attempted', 'solved')
export type ProgressStatus = typeof ProgressStatus.Type

export const Progress = Schema.Struct({
  user_id: Schema.Number,
  problem_id: Schema.Number,
  status: ProgressStatus,
  first_solved_at: Schema.NullOr(Schema.String),
  attempts_count: Schema.Number
})
export type Progress = typeof Progress.Type

export const ProgressFile = Schema.Struct({
  progress: Schema.Array(Progress)
})

export const Submission = Schema.Struct({
  id: Schema.Number,
  user_id: Schema.Number,
  problem_id: Schema.Number,
  user_answer: Schema.String,
  is_correct: Schema.Boolean,
  judge_detail: Schema.NullOr(Schema.String),
  submitted_at: Schema.String
})
export type Submission = typeof Submission.Type

export const SubmissionFile = Schema.Struct({
  submissions: Schema.Array(Submission)
})

export const LeaderboardEntry = Schema.Struct({
  rank: Schema.Number,
  username: Schema.String,
  avatar_url: Schema.NullOr(Schema.String),
  score: Schema.Number,
  solved_count: Schema.Number
})
export type LeaderboardEntry = typeof LeaderboardEntry.Type

export const LeaderboardFile = Schema.Struct({
  leaderboard: Schema.Array(LeaderboardEntry)
})

export const ProblemTypeLabel: Record<ProblemType, string> = {
  infer_type: 'Type Signature',
  find_function: 'Find Function',
  predict_behavior: 'Choice'
}

export const ProblemTypeOrder: ProblemType[] = ['infer_type', 'find_function', 'predict_behavior']
