import { A, useLocation } from '@solidjs/router'
import { For, type JSX, Show } from 'solid-js'
import { useAuth } from '../context/auth'

type NavLink = { href: string; label: string; match: (path: string) => boolean }

const links: readonly NavLink[] = [
  { href: '/', label: 'Problem List', match: (p) => p === '/' || p.startsWith('/quiz') },
  { href: '/leaderboard', label: 'Leaderboard', match: (p) => p.startsWith('/leaderboard') },
  { href: '/submissions', label: 'Submissions', match: (p) => p.startsWith('/submissions') }
]

export const Headbar = (): JSX.Element => {
  const { state } = useAuth()
  const location = useLocation()

  const profileActive = (): boolean => location.pathname.startsWith('/profile')

  return (
    <header
      class="relative z-90 flex shrink-0 items-center justify-between gap-1.5 px-3 py-2 md:px-4 md:py-2.5 lg:px-7 lg:py-3.5 max-[480px]:flex-col bg-head border-b border-sep shadow-[0_6px_24px_var(--shadow)] transition-colors"
      id="headbar"
    >
      <A href="/" class="flex shrink-0 items-baseline gap-2.5 no-underline" aria-label="Home">
        <span class="text-[22px] font-bold text-brand">λ</span>
        <span class="text-[15px] md:text-lg font-semibold tracking-tight text-strong">MONAD BEAT</span>
      </A>
      <nav class="flex shrink-0 flex-wrap items-center justify-center gap-1">
        <For each={links}>
          {(link) => (
            <A
              href={link.href}
              class={`px-2 md:px-3 py-1 text-[13px] md:text-sm no-underline transition-colors ${
                link.match(location.pathname) ? 'text-soft' : 'text-muted hover:text-hl-sub'
              }`}
            >
              {link.label}
            </A>
          )}
        </For>
        <A
          href="/profile"
          aria-label="Profile"
          title={state.user?.username ?? 'Guest'}
          class={`ml-1.5 flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 bg-[radial-gradient(circle_at_30%_25%,var(--av1),var(--av2)_70%)] no-underline transition-[border-color,box-shadow] hover:border-soft hover:shadow-[0_0_14px_var(--glow)] ${
            profileActive() ? 'border-accent' : 'border-edge'
          }`}
        >
          <Show
            when={state.user?.avatar_url}
            fallback={<span class="text-sm font-bold leading-none text-soft">λ</span>}
          >
            <img class="block size-full object-cover" src={state.user?.avatar_url ?? ''} alt="avatar" />
          </Show>
        </A>
      </nav>
    </header>
  )
}
