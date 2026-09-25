import { Option, Schema } from 'effect'
import { type User, User as UserSchema } from './schema'

const CURRENT_USER_KEY = 'monadbeat.currentUser'

export const readCurrentUser = (): Option.Option<User> => {
  const raw = localStorage.getItem(CURRENT_USER_KEY)
  if (raw === null) return Option.none()
  const parsed = Schema.decodeUnknownOption(UserSchema)(JSON.parse(raw))
  return parsed
}

export const writeCurrentUser = (user: User): void => {
  localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user))
}

export const clearCurrentUser = (): void => {
  localStorage.removeItem(CURRENT_USER_KEY)
}
