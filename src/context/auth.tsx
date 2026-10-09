import { Effect } from 'effect'
import { createContext, type JSX, onMount, useContext } from 'solid-js'
import { createStore } from 'solid-js/store'
import { fetchMe } from '../lib/api'
import { clearCurrentUser, clearToken, readCurrentUser, readToken, writeCurrentUser, writeToken } from '../lib/storage'
import type { MeResponse } from '../lib/types'

type AuthStore = {
  user: MeResponse | null
  token: string | null
}

type AuthContextValue = {
  state: AuthStore
  signIn: (user: MeResponse, token: string) => void
  signOut: () => void
}

const AuthContext = createContext<AuthContextValue>()

const readStoredUser = (): MeResponse | null => {
  const stored = readCurrentUser().pipe((o) => (o._tag === 'Some' ? o.value : null))
  if (stored === null) return null
  return typeof stored.role === 'string' ? stored : null
}

const readStoredToken = (): string | null => readToken().pipe((o) => (o._tag === 'Some' ? o.value : null))

export const AuthProvider = (props: { children: JSX.Element }): JSX.Element => {
  const [state, setState] = createStore<AuthStore>({
    user: readStoredUser(),
    token: readStoredToken()
  })

  const value: AuthContextValue = {
    state,
    signIn: (user, token) => {
      writeCurrentUser(user)
      writeToken(token)
      setState({ user, token })
    },
    signOut: () => {
      clearCurrentUser()
      clearToken()
      setState({ user: null, token: null })
    }
  }

  onMount(() => {
    const token = state.token
    if (token === null) return
    Effect.runPromise(fetchMe(token))
      .then((user) => {
        writeCurrentUser(user)
        setState({ user })
      })
      .catch(() => {
        clearCurrentUser()
        clearToken()
        setState({ user: null, token: null })
      })
  })

  return <AuthContext.Provider value={value}>{props.children}</AuthContext.Provider>
}

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext)
  if (ctx === undefined) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
