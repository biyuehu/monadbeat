import type { components } from './api-types'

export type ProblemListItem = components['schemas']['ProblemListItem']
export type ProblemDetail = components['schemas']['ProblemDetailResponse']
export type TextDisplay = components['schemas']['TextDisplay']
export type ChoiceDisplay = components['schemas']['ChoiceDisplay']
export type Display = ProblemDetail['display']

export type MeResponse = components['schemas']['MeResponse']
export type PublicUserResponse = components['schemas']['PublicUserResponse']

export type LeaderboardItem = components['schemas']['LeaderboardItem']
export type LeaderboardResponse = components['schemas']['LeaderboardResponse']

export type SubmitRequest = components['schemas']['SubmitRequest']
export type SubmissionResponse = components['schemas']['SubmissionResponse']
export type SubmissionListItem = components['schemas']['SubmissionListItem']
export type ProgressItem = components['schemas']['ProgressItem']

export const ProblemTypeOrder = ['infer_type', 'find_function', 'predict_behavior'] as const
export type ProblemType = (typeof ProblemTypeOrder)[number]

export const ProblemTypeLabel: Record<ProblemType, string> = {
  infer_type: 'Infer',
  find_function: 'Find',
  predict_behavior: 'Predict'
}

export const isProblemType = (value: string): value is ProblemType =>
  (ProblemTypeOrder as readonly string[]).includes(value)
