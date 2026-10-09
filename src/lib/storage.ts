import { Option } from 'effect'
import type { MeResponse } from './types'

const CURRENT_USER_KEY = 'monadbeat.currentUser'
const TOKEN_KEY = 'monadbeat.token'

export const readCurrentUser = (): Option.Option<MeResponse> => {
  const raw = localStorage.getItem(CURRENT_USER_KEY)
  if (raw === null) return Option.none()
  try {
    return Option.some(JSON.parse(raw) as MeResponse)
  } catch {
    return Option.none()
  }
}

export const writeCurrentUser = (user: MeResponse): void => {
  localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user))
}

export const clearCurrentUser = (): void => {
  localStorage.removeItem(CURRENT_USER_KEY)
}

export const readToken = (): Option.Option<string> => {
  const raw = localStorage.getItem(TOKEN_KEY)
  return raw === null ? Option.none() : Option.some(raw)
}

export const writeToken = (token: string): void => {
  localStorage.setItem(TOKEN_KEY, token)
}

export const clearToken = (): void => {
  localStorage.removeItem(TOKEN_KEY)
}
