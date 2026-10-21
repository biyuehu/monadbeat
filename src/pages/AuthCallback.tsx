import { useNavigate, useSearchParams } from '@solidjs/router'
import { Effect } from 'effect'
import { createEffect, type JSX } from 'solid-js'
import { fetchMe } from '../api'
import { Frame } from '../components/Frame'
import { useAuth } from '../context/auth'

export const AuthCallback = (): JSX.Element => {
  const [params] = useSearchParams<{ token?: string }>()
  const { signIn } = useAuth()
  const navigate = useNavigate()

  createEffect(() => {
    const token = params.token
    if (token === undefined || token === '') {
      navigate('/profile')
      return
    }
    Effect.runPromise(fetchMe(token))
      .then((user) => {
        signIn(user, token)
        navigate('/profile')
      })
      .catch(() => navigate('/profile'))
  })

  return (
    <Frame title="Signing in">
      <div class="status-text text-dim">Signing in...</div>
    </Frame>
  )
}
