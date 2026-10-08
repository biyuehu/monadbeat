import { useNavigate, useSearchParams } from '@solidjs/router'
import { Effect } from 'effect'
import { createEffect, type JSX } from 'solid-js'
import { RouteTitle } from '../components/RouteTitle'
import { useAuth } from '../context/auth'
import { fetchMe } from '../lib/api'

export const AuthCallbackRoute = (): JSX.Element => {
  const [params] = useSearchParams<{ token?: string }>()
  const { signIn } = useAuth()
  const navigate = useNavigate()

  createEffect(() => {
    const token = params.token
    if (token === undefined || token === '') {
      navigate('/account')
      return
    }
    Effect.runPromise(fetchMe(token))
      .then((user) => {
        signIn(user, token)
        navigate('/profile')
      })
      .catch(() => navigate('/account'))
  })

  return (
    <div class="mainFrame">
      <RouteTitle>Signing in</RouteTitle>
      <div class="terminal">
        <div class="loading-text">Signing in...</div>
      </div>
    </div>
  )
}
