import { type JSX } from 'solid-js'
import { RouteTitle } from '../components/RouteTitle'

const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:8000'

export const AccountRoute = (): JSX.Element => {
  const goLogin = (): void => {
    window.location.href = `${API_BASE}/auth/github/login`
  }

  return (
    <div class="mainFrame">
      <RouteTitle>Account</RouteTitle>
      <div class="terminal accountTerminal">
        <div class="welcomeBlock">
          <h1 class="welcomeTitle">WELCOME</h1>
          <p class="welcomeLine">Hello, dear visitor.</p>
          <p class="welcomeLine">A quiet place for Haskell practice.</p>
          <p class="welcomeLine">Sign in with GitHub to keep track of every question you solve.</p>
        </div>

        <div class="accountBox">
          <div class="accountForm">
            <div class="formMsg" />
            <div class="formFooter">
              <span class="linkBtn" />
              <button type="button" class="primaryBtn" onClick={goLogin}>
                Sign in with GitHub
              </button>
            </div>
          </div>
        </div>

        <div class="footerLine">
          <span>λ Monad Beat</span>
          <span>Haskell Practice</span>
        </div>
      </div>
    </div>
  )
}