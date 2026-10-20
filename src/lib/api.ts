import { Effect } from 'effect'
import type {
  LeaderboardItem,
  MeResponse,
  ProblemDetail,
  ProblemListItem,
  ProgressItem,
  SubmissionListItem,
  SubmissionResponse
} from './types'

const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:8000'

export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly detail?: string

  constructor(status: number, code: string, message: string, detail?: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.detail = detail
  }
}

type ErrorPayload = {
  code?: string
  message?: string
  detail?: string
}

let unauthorizedHandler: (() => void) | null = null

export const setUnauthorizedHandler = (handler: (() => void) | null): void => {
  unauthorizedHandler = handler
}

const parseErrorResponse = async (r: Response, path: string): Promise<ApiError> => {
  try {
    const data = (await r.json()) as ErrorPayload
    const code = data.code ?? `HTTP_${r.status}`
    const message = data.message ?? (typeof data.detail === 'string' ? data.detail : `HTTP ${r.status} ${path}`)
    return new ApiError(r.status, code, message, data.detail)
  } catch {
    return new ApiError(r.status, `HTTP_${r.status}`, `HTTP ${r.status} ${path}`)
  }
}

const asError = (cause: unknown): Error => (cause instanceof Error ? cause : new Error(String(cause)))

const fetchJson = <A>(path: string, init?: RequestInit): Effect.Effect<A, ApiError | Error> =>
  Effect.tryPromise({
    try: async () => {
      const r = await fetch(`${API_BASE}${path}`, init)
      if (r.ok) {
        return (await r.json()) as A
      }
      const err = await parseErrorResponse(r, path)
      if (r.status === 401 && unauthorizedHandler !== null) {
        unauthorizedHandler()
      }
      return Promise.reject(err)
    },
    catch: asError
  })


const authInit = (token: string, init?: RequestInit): RequestInit => ({
  ...init,
  headers: { ...init?.headers, Authorization: `Bearer ${token}` }
})

export const fetchProblems = (): Effect.Effect<readonly ProblemListItem[], ApiError | Error> =>
  fetchJson<{ items: ProblemListItem[] }>('/problems/').pipe(Effect.map((r) => r.items))

export const fetchProblemDetail = (slug: string): Effect.Effect<ProblemDetail, ApiError | Error> =>
  fetchJson<ProblemDetail>(`/problems/${encodeURIComponent(slug)}`)

export const fetchLeaderboard = (): Effect.Effect<readonly LeaderboardItem[], ApiError | Error> =>
  fetchJson<{ items: LeaderboardItem[] }>('/leaderboard/').pipe(Effect.map((r) => r.items))

export const fetchMe = (token: string): Effect.Effect<MeResponse, ApiError | Error> =>
  fetchJson<MeResponse>('/me', authInit(token))

export const fetchSubmissions = (
  token: string,
  pageSize = 100
): Effect.Effect<readonly SubmissionListItem[], ApiError | Error> =>
  fetchJson<{ items: SubmissionListItem[] }>(`/submissions/?page_size=${pageSize}`, authInit(token)).pipe(
    Effect.map((r) => r.items)
  )

export const fetchProgress = (token: string): Effect.Effect<readonly ProgressItem[], ApiError | Error> =>
  fetchJson<{ items: ProgressItem[] }>('/submissions/progress', authInit(token)).pipe(Effect.map((r) => r.items))

export const submitAnswer = (
  slug: string,
  answer: string,
  token: string
): Effect.Effect<SubmissionResponse, ApiError | Error> =>
  fetchJson<SubmissionResponse>(
    '/submissions/',
    authInit(token, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ problem_slug: slug, user_answer: answer })
    })
  )
