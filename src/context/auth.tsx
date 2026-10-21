import { Effect } from 'effect'
import { createContext, type JSX, onCleanup, onMount, useContext } from 'solid-js'
import { createStore } from 'solid-js/store'
import { ApiError, fetchMe, setUnauthorizedHandler } from '../api'
import { clearCurrentUser, clearToken, readCurrentUser, readToken, writeCurrentUser, writeToken } from '../lib/storage'
import type { MeResponse } from '../types'

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

const readStoredUser = (): MeResponse | null => readCurrentUser().pipe((o) => (o._tag === 'Some' ? o.value : null))

const readStoredToken = (): string | null => readToken().pipe((o) => (o._tag === 'Some' ? o.value : null))

export const AuthProvider = (props: { children: JSX.Element }): JSX.Element => {
  const [state, setState] = createStore<AuthStore>({
    user: readStoredUser(),
    token: readStoredToken()
  })

  const doSignOut = (): void => {
    clearCurrentUser()
    clearToken()
    setState({ user: null, token: null })
  }

  const value: AuthContextValue = {
    state,
    signIn: (user, token) => {
      writeCurrentUser(user)
      writeToken(token)
      setState({ user, token })
    },
    signOut: doSignOut
  }

  onMount(() => {
    // Register global 401 handler so any API call auto-signs-out on token expiry
    setUnauthorizedHandler(doSignOut)

    // Sync sign-in/out across tabs via storage events
    const onStorageChange = (e: StorageEvent): void => {
      if (e.key === 'monadbeat.token') {
        if (e.newValue === null) {
          // Signed out in another tab
          setState({ user: null, token: null })
        } else {
          // Signed in (or token refreshed) in another tab — re-read user from storage
          const token = e.newValue
          const user = readStoredUser()
          setState({ user, token })
        }
      }
    }
    window.addEventListener('storage', onStorageChange)
    onCleanup(() => {
      window.removeEventListener('storage', onStorageChange)
      setUnauthorizedHandler(null)
    })

    // Validate stored token against server on mount
    const token = state.token
    if (token === null) return
    Effect.runPromise(fetchMe(token))
      .then((user) => {
        writeCurrentUser(user)
        setState({ user })
      })
      .catch((err: unknown) => {
        // 401 → token expired/revoked → sign out
        if (err instanceof ApiError && err.status === 401) {
          doSignOut()
        }
        // Other errors (network, 5xx) → keep user signed in optimistically
      })
  })

  return <AuthContext.Provider value={value}>{props.children}</AuthContext.Provider>
}

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext)
  if (ctx === undefined) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
