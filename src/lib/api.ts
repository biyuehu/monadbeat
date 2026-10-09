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

const asError = (cause: unknown): Error => (cause instanceof Error ? cause : new Error(String(cause)))

const fetchJson = <A>(path: string, init?: RequestInit): Effect.Effect<A, Error> =>
  Effect.tryPromise({
    try: () =>
      fetch(`${API_BASE}${path}`, init).then((r) =>
        r.ok ? (r.json() as Promise<A>) : Promise.reject(new Error(`HTTP ${r.status} ${path}`))
      ),
    catch: asError
  })

const authInit = (token: string, init?: RequestInit): RequestInit => ({
  ...init,
  headers: { ...init?.headers, Authorization: `Bearer ${token}` }
})

export const fetchProblems = (): Effect.Effect<readonly ProblemListItem[], Error> =>
  fetchJson<{ items: ProblemListItem[] }>('/problems/').pipe(Effect.map((r) => r.items))

export const fetchProblemDetail = (slug: string): Effect.Effect<ProblemDetail, Error> =>
  fetchJson<ProblemDetail>(`/problems/${encodeURIComponent(slug)}`)

export const fetchLeaderboard = (): Effect.Effect<readonly LeaderboardItem[], Error> =>
  fetchJson<{ items: LeaderboardItem[] }>('/leaderboard/').pipe(Effect.map((r) => r.items))

export const fetchMe = (token: string): Effect.Effect<MeResponse, Error> =>
  fetchJson<MeResponse>('/me', authInit(token))

export const fetchSubmissions = (token: string, pageSize = 100): Effect.Effect<readonly SubmissionListItem[], Error> =>
  fetchJson<{ items: SubmissionListItem[] }>(`/submissions/?page_size=${pageSize}`, authInit(token)).pipe(
    Effect.map((r) => r.items)
  )

export const fetchProgress = (token: string): Effect.Effect<readonly ProgressItem[], Error> =>
  fetchJson<{ items: ProgressItem[] }>('/submissions/progress', authInit(token)).pipe(Effect.map((r) => r.items))

export const submitAnswer = (slug: string, answer: string, token: string): Effect.Effect<SubmissionResponse, Error> =>
  fetchJson<SubmissionResponse>(
    '/submissions/',
    authInit(token, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ problem_slug: slug, user_answer: answer })
    })
  )
