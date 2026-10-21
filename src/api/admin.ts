import { Effect } from 'effect'
import type { components } from '../types/api-types'
import { ApiError } from './index'

const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:8000'

export type ProblemAdminItem = components['schemas']['ProblemAdminItem']
export type ProblemAdminDetail = components['schemas']['ProblemAdminDetail']
export type ProblemCreate = components['schemas']['ProblemCreate']
export type ProblemUpdate = components['schemas']['ProblemUpdate']
export type UserAdminItem = components['schemas']['UserAdminItem']
export type BanItem = components['schemas']['BanItem']
export type BanCreate = components['schemas']['BanCreate']

type ErrorPayload = { code?: string; message?: string; detail?: string }

const adminFetch = <A>(path: string, token: string, init?: RequestInit): Effect.Effect<A, ApiError | Error> =>
  Effect.tryPromise({
    try: async () => {
      const r = await fetch(`${API_BASE}${path}`, {
        ...init,
        headers: {
          ...init?.headers,
          Authorization: `Bearer ${token}`,
          ...(init?.body ? { 'Content-Type': 'application/json' } : {})
        }
      })
      if (r.ok) {
        if (r.status === 204) return undefined as A
        return (await r.json()) as A
      }
      let code = `HTTP_${r.status}`
      let message = `HTTP ${r.status} ${path}`
      try {
        const data = (await r.json()) as ErrorPayload
        code = data.code ?? code
        message = data.message ?? (typeof data.detail === 'string' ? data.detail : message)
      } catch {
        /* ignore */
      }
      return Promise.reject(new ApiError(r.status, code, message))
    },
    catch: (e) => (e instanceof Error ? e : new Error(String(e)))
  })

// ── Problems ─────────────────────────────────────────────────────────────

export const adminListProblems = (token: string): Effect.Effect<ProblemAdminItem[], ApiError | Error> =>
  adminFetch<ProblemAdminItem[]>('/admin/problems', token)

export const adminGetProblem = (slug: string, token: string): Effect.Effect<ProblemAdminDetail, ApiError | Error> =>
  adminFetch<ProblemAdminDetail>(`/admin/problems/${encodeURIComponent(slug)}`, token)

export const adminCreateProblem = (
  body: ProblemCreate,
  token: string
): Effect.Effect<ProblemAdminDetail, ApiError | Error> =>
  adminFetch<ProblemAdminDetail>('/admin/problems', token, {
    method: 'POST',
    body: JSON.stringify(body)
  })

export const adminUpdateProblem = (
  slug: string,
  body: ProblemUpdate,
  token: string
): Effect.Effect<ProblemAdminDetail, ApiError | Error> =>
  adminFetch<ProblemAdminDetail>(`/admin/problems/${encodeURIComponent(slug)}`, token, {
    method: 'PUT',
    body: JSON.stringify(body)
  })

export const adminDeleteProblem = (slug: string, token: string): Effect.Effect<void, ApiError | Error> =>
  adminFetch<void>(`/admin/problems/${encodeURIComponent(slug)}`, token, { method: 'DELETE' })

export const adminPublishToggle = (
  slug: string,
  is_published: boolean,
  token: string
): Effect.Effect<ProblemAdminDetail, ApiError | Error> => adminUpdateProblem(slug, { is_published }, token)

// ── Users ─────────────────────────────────────────────────────────────────

export const adminListUsers = (token: string): Effect.Effect<UserAdminItem[], ApiError | Error> =>
  adminFetch<UserAdminItem[]>('/admin/users', token)

export const adminListBans = (token: string): Effect.Effect<BanItem[], ApiError | Error> =>
  adminFetch<BanItem[]>('/admin/bans', token)

export const adminBanUser = (
  username: string,
  body: BanCreate,
  token: string
): Effect.Effect<BanItem, ApiError | Error> =>
  adminFetch<BanItem>(`/admin/users/${encodeURIComponent(username)}/ban`, token, {
    method: 'POST',
    body: JSON.stringify(body)
  })

export const adminLiftBan = (banId: number, token: string): Effect.Effect<BanItem, ApiError | Error> =>
  adminFetch<BanItem>(`/admin/bans/${banId}/lift`, token, { method: 'PUT' })

export const adminPromote = (username: string, token: string): Effect.Effect<UserAdminItem, ApiError | Error> =>
  adminFetch<UserAdminItem>(`/admin/users/${encodeURIComponent(username)}/promote`, token, { method: 'POST' })

export const adminDemote = (username: string, token: string): Effect.Effect<UserAdminItem, ApiError | Error> =>
  adminFetch<UserAdminItem>(`/admin/users/${encodeURIComponent(username)}/demote`, token, { method: 'POST' })
