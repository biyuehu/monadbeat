import { Option } from 'effect'
import type { MeResponse } from '../types'

const CURRENT_USER_KEY = 'monadbeat.currentUser'
const TOKEN_KEY = 'monadbeat.token'

export const isJwtExpired = (token: string, leewaySeconds = 10): boolean => {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return true
    const payloadStr = atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'))
    const payload = JSON.parse(payloadStr) as { exp?: unknown }
    if (typeof payload.exp !== 'number') return false
    const nowSec = Math.floor(Date.now() / 1000)
    return payload.exp <= nowSec + leewaySeconds
  } catch {
    return true
  }
}

const isValidUser = (val: unknown): val is MeResponse => {
  if (typeof val !== 'object' || val === null) return false
  const obj = val as Record<string, unknown>
  return (
    typeof obj.id === 'number' &&
    typeof obj.username === 'string' &&
    (obj.avatar_url === null || typeof obj.avatar_url === 'string') &&
    typeof obj.role === 'string' &&
    typeof obj.created_at === 'string'
  )
}

export const readToken = (): Option.Option<string> => {
  const raw = localStorage.getItem(TOKEN_KEY)
  if (raw === null) return Option.none()
  if (isJwtExpired(raw)) {
    clearToken()
    clearCurrentUser()
    return Option.none()
  }
  return Option.some(raw)
}

export const writeToken = (token: string): void => {
  localStorage.setItem(TOKEN_KEY, token)
}

export const clearToken = (): void => {
  localStorage.removeItem(TOKEN_KEY)
}

export const readCurrentUser = (): Option.Option<MeResponse> => {
  // If token is expired or missing, user is also treated as missing
  const tokenOpt = readToken()
  if (tokenOpt._tag === 'None') {
    clearCurrentUser()
    return Option.none()
  }

  const raw = localStorage.getItem(CURRENT_USER_KEY)
  if (raw === null) return Option.none()
  try {
    const parsed = JSON.parse(raw) as unknown
    if (isValidUser(parsed)) {
      return Option.some(parsed)
    }
    clearCurrentUser()
    return Option.none()
  } catch {
    clearCurrentUser()
    return Option.none()
  }
}

export const writeCurrentUser = (user: MeResponse): void => {
  localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user))
}

export const clearCurrentUser = (): void => {
  localStorage.removeItem(CURRENT_USER_KEY)
}
