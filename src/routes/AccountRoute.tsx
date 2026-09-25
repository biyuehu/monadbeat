import { useNavigate } from '@solidjs/router'
import { Effect } from 'effect'
import { createSignal, type JSX, Show } from 'solid-js'
import { RouteTitle } from '../components/RouteTitle'
import { useAuth } from '../context/auth'
import { fetchUsers, findUserByName } from '../lib/api'

type Mode = 'login' | 'signup'
type FieldErrors = { name?: string; email?: string; password?: string; captcha?: string }
type FormMessage = { kind: 'ok' | 'error' | 'info'; text: string } | null

const CAPTCHA_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const randomCode = (len: number): string =>
  Array.from({ length: len }, () => CAPTCHA_CHARS[Math.floor(Math.random() * CAPTCHA_CHARS.length)]).join('')

const isValidEmail = (v: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)

export const AccountRoute = (): JSX.Element => {
  const navigate = useNavigate()
  const { signIn } = useAuth()
  const [mode, setMode] = createSignal<Mode>('login')
  const [loginName, setLoginName] = createSignal('')
  const [loginPassword, setLoginPassword] = createSignal('')
  const [signupName, setSignupName] = createSignal('')
  const [signupEmail, setSignupEmail] = createSignal('')
  const [signupPassword, setSignupPassword] = createSignal('')
  const [captchaInput, setCaptchaInput] = createSignal('')
  const [captchaCode, setCaptchaCode] = createSignal(randomCode(4))
  const [errors, setErrors] = createSignal<FieldErrors>({})
  const [message, setMessage] = createSignal<FormMessage>(null)

  const refreshCaptcha = (): void => {
    setCaptchaCode(randomCode(4))
    setCaptchaInput('')
  }

  const submitLogin = async (e: Event): Promise<void> => {
    e.preventDefault()
    const nextErrors: FieldErrors = {}
    if (loginName().trim() === '') nextErrors.name = 'Please enter your username'
    if (loginPassword() === '') nextErrors.password = 'Please enter your password'
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return
    setMessage({ kind: 'info', text: 'Checking...' })
    try {
      const user = await Effect.runPromise(findUserByName(loginName().trim()))
      if (user === undefined) {
        setErrors({ name: 'User does not exist' })
        setMessage({ kind: 'error', text: 'Login failed: user not found' })
        return
      }
      signIn(user)
      setMessage({ kind: 'ok', text: 'Signed in. Redirecting...' })
      setTimeout(() => navigate('/profile'), 500)
    } catch (err) {
      setMessage({ kind: 'error', text: `Login failed: ${String(err)}` })
    }
  }

  const submitSignup = async (e: Event): Promise<void> => {
    e.preventDefault()
    const nextErrors: FieldErrors = {}
    if (signupName().trim() === '') nextErrors.name = 'Please enter your name'
    if (!isValidEmail(signupEmail().trim())) nextErrors.email = 'Email format is invalid'
    if (signupPassword().length < 6) nextErrors.password = 'Password must be at least 6 characters'
    if (captchaInput().trim().toUpperCase() !== captchaCode()) {
      nextErrors.captcha = 'Captcha is incorrect'
      refreshCaptcha()
    }
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return
    setMessage({ kind: 'info', text: 'Creating account...' })
    try {
      const users = await Effect.runPromise(fetchUsers)
      const exists = users.some((u) => u.username === signupName().trim())
      if (exists) {
        setErrors({ name: 'That username is already taken' })
        setMessage({ kind: 'error', text: 'Sign-up failed: user exists' })
        return
      }
      // TODO: replace with backend POST /auth/signup once ready
      setMessage({ kind: 'ok', text: 'Account created. Switching to sign in...' })
      setTimeout(() => {
        setMode('login')
        setLoginName(signupName())
      }, 600)
    } catch (err) {
      setMessage({ kind: 'error', text: `Sign-up failed: ${String(err)}` })
    }
  }

  return (
    <div class="mainFrame">
      <RouteTitle>Account</RouteTitle>
      <div class="terminal accountTerminal">
        <div class="welcomeBlock">
          <h1 class="welcomeTitle">{mode() === 'login' ? 'WELCOME' : 'SIGN UP'}</h1>
          <p class="welcomeLine">
            {mode() === 'login' ? 'Hello, dear visitor.' : 'Create your account to save your progress.'}
          </p>
          <p class="welcomeLine">
            {mode() === 'login' ? 'A quiet place for Haskell practice.' : 'Everything stays on this machine.'}
          </p>
          <p class="welcomeLine">
            {mode() === 'login'
              ? 'Sign in to keep track of every question you solve.'
              : 'Fill in the captcha to prove you are human.'}
          </p>
        </div>

        <div class="accountBox">
          <Show
            when={mode() === 'login'}
            fallback={
              <form class="accountForm" novalidate onSubmit={submitSignup}>
                <label class="field">
                  <span class="fieldLabel">Name</span>
                  <input
                    type="text"
                    class="fieldInput"
                    classList={{ invalid: errors().name !== undefined }}
                    value={signupName()}
                    onInput={(e) => setSignupName(e.currentTarget.value)}
                  />
                  <span class="fieldError">{errors().name ?? ''}</span>
                </label>
                <label class="field">
                  <span class="fieldLabel">Email</span>
                  <input
                    type="email"
                    class="fieldInput"
                    classList={{ invalid: errors().email !== undefined }}
                    value={signupEmail()}
                    onInput={(e) => setSignupEmail(e.currentTarget.value)}
                  />
                  <span class="fieldError">{errors().email ?? ''}</span>
                </label>
                <label class="field">
                  <span class="fieldLabel">Password</span>
                  <input
                    type="password"
                    class="fieldInput"
                    classList={{ invalid: errors().password !== undefined }}
                    value={signupPassword()}
                    onInput={(e) => setSignupPassword(e.currentTarget.value)}
                  />
                  <span class="fieldError">{errors().password ?? ''}</span>
                </label>
                <label class="field">
                  <span class="fieldLabel">Captcha</span>
                  <div class="captchaRow">
                    <input
                      type="text"
                      class="fieldInput"
                      maxlength="4"
                      value={captchaInput()}
                      onInput={(e) => setCaptchaInput(e.currentTarget.value)}
                    />
                    <button type="button" class="captchaCanvas" onClick={refreshCaptcha}>
                      {captchaCode()}
                    </button>
                  </div>
                  <span class="fieldError">{errors().captcha ?? ''}</span>
                </label>
                <div class={`formMsg ${message()?.kind ?? ''}`}>{message()?.text ?? ''}</div>
                <div class="formFooter">
                  <button type="button" class="linkBtn" onClick={() => setMode('login')}>
                    Already have an account? Sign in
                  </button>
                  <button type="submit" class="primaryBtn">
                    Create account
                  </button>
                </div>
              </form>
            }
          >
            <form class="accountForm" novalidate onSubmit={submitLogin}>
              <label class="field">
                <span class="fieldLabel">Username</span>
                <input
                  type="text"
                  class="fieldInput"
                  classList={{ invalid: errors().name !== undefined }}
                  value={loginName()}
                  onInput={(e) => setLoginName(e.currentTarget.value)}
                />
                <span class="fieldError">{errors().name ?? ''}</span>
              </label>
              <label class="field">
                <span class="fieldLabel">Password</span>
                <input
                  type="password"
                  class="fieldInput"
                  classList={{ invalid: errors().password !== undefined }}
                  value={loginPassword()}
                  onInput={(e) => setLoginPassword(e.currentTarget.value)}
                />
                <span class="fieldError">{errors().password ?? ''}</span>
              </label>
              <div class={`formMsg ${message()?.kind ?? ''}`}>{message()?.text ?? ''}</div>
              <div class="formFooter">
                <button type="button" class="linkBtn" onClick={() => setMode('signup')}>
                  No account? Sign up
                </button>
                <button type="submit" class="primaryBtn">
                  Sign in
                </button>
              </div>
            </form>
          </Show>
        </div>

        <div class="footerLine">
          <span>λ Monad Beat</span>
          <span>Haskell Practice</span>
        </div>
      </div>
    </div>
  )
}
