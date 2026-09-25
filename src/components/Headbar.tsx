import { A, useLocation } from '@solidjs/router'
import { createEffect, type JSX, Show } from 'solid-js'
import { useAuth } from '../context/auth'

const links = [
  { href: '/', label: 'Question List', key: 'problems' },
  { href: '/account', label: 'Login', key: 'login' },
  { href: '/profile', label: 'Profile', key: 'profile' },
  { href: '/leaderboard', label: 'Leaderboard', key: 'rank' }
] as const

export const Headbar = (): JSX.Element => {
  const { state } = useAuth()
  const location = useLocation()

  createEffect(() => {
    document.body.classList.add('has-headbar')
  })

  return (
    <header class="headbar" id="headbar">
      <div class="logo">
        <span class="mainLogo">λ</span>
        <span class="logoText">MONAD BEAT</span>
      </div>
      <div class="gotoLinkFrame">
        {links.map((link) => (
          <Show when={link.key !== 'login' || state.user === null}>
            <A
              href={link.href}
              class="gotoLink"
              classList={{ active: location.pathname === link.href }}
              data-key={link.key}
            >
              {link.label}
            </A>
          </Show>
        ))}
      </div>
    </header>
  )
}
