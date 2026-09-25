import { Effect, Schema } from 'effect'
import {
  type LeaderboardEntry,
  LeaderboardFile,
  type Problem,
  ProblemFile,
  type Progress,
  ProgressFile,
  type Submission,
  SubmissionFile,
  type User,
  UsersFile
} from './schema'

const fetchJson = (path: string): Effect.Effect<unknown, Error> =>
  Effect.tryPromise({
    try: () => fetch(path).then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status} ${path}`)))),
    catch: (cause) => (cause instanceof Error ? cause : new Error(String(cause)))
  })

const decode =
  <A, I>(schema: Schema.Schema<A, I>) =>
  (input: unknown): Effect.Effect<A, Error> =>
    Schema.decodeUnknown(schema)(input).pipe(Effect.mapError((e) => new Error(String(e))))

export const fetchProblems: Effect.Effect<readonly Problem[], Error> = fetchJson('/datas/quiz.json').pipe(
  Effect.flatMap(decode(ProblemFile)),
  Effect.map((f) => f.problems)
)

export const fetchUsers: Effect.Effect<readonly User[], Error> = fetchJson('/datas/users.json').pipe(
  Effect.flatMap(decode(UsersFile)),
  Effect.map((f) => f.users)
)

export const fetchProgress: Effect.Effect<readonly Progress[], Error> = fetchJson('/datas/progress.json').pipe(
  Effect.flatMap(decode(ProgressFile)),
  Effect.map((f) => f.progress)
)

export const fetchSubmissions: Effect.Effect<readonly Submission[], Error> = fetchJson('/datas/submissions.json').pipe(
  Effect.flatMap(decode(SubmissionFile)),
  Effect.map((f) => f.submissions)
)

export const fetchLeaderboard: Effect.Effect<readonly LeaderboardEntry[], Error> = fetchJson(
  '/datas/leaderboard.json'
).pipe(
  Effect.flatMap(decode(LeaderboardFile)),
  Effect.map((f) => f.leaderboard)
)

export const findUserByName = (username: string): Effect.Effect<User | undefined, Error> =>
  fetchUsers.pipe(Effect.map((users) => users.find((u) => u.username === username)))

export const progressForUser = (userId: number): Effect.Effect<readonly Progress[], Error> =>
  fetchProgress.pipe(Effect.map((rows) => rows.filter((p) => p.user_id === userId)))

export const submissionsForUser = (userId: number): Effect.Effect<readonly Submission[], Error> =>
  fetchSubmissions.pipe(Effect.map((rows) => rows.filter((s) => s.user_id === userId)))
