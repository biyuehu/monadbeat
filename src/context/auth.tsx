import { createContext, type JSX, useContext } from 'solid-js'
import { createStore } from 'solid-js/store'
import type { User } from '../lib/schema'
import { clearCurrentUser, readCurrentUser, writeCurrentUser } from '../lib/storage'

type AuthStore = {
  user: User | null
}

type AuthContextValue = {
  state: AuthStore
  signIn: (user: User) => void
  signOut: () => void
}

const AuthContext = createContext<AuthContextValue>()

export const AuthProvider = (props: { children: JSX.Element }): JSX.Element => {
  const [state, setState] = createStore<AuthStore>({
    user: readCurrentUser().pipe((o) => (o._tag === 'Some' ? o.value : null))
  })

  const value: AuthContextValue = {
    state,
    signIn: (user) => {
      writeCurrentUser(user)
      setState('user', user)
    },
    signOut: () => {
      clearCurrentUser()
      setState('user', null)
    }
  }

  return <AuthContext.Provider value={value}>{props.children}</AuthContext.Provider>
}

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext)
  if (ctx === undefined) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
