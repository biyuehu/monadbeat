import { A, useLocation } from '@solidjs/router'
import { type JSX, Show } from 'solid-js'
import { useAuth } from '../context/auth'

const NavLink = (props: { href: string; label: string; active: boolean }): JSX.Element => (
  <A
    href={props.href}
    class={`px-2 md:px-3 py-1 text-[13px] md:text-sm no-underline transition-colors ${
      props.active ? 'text-soft' : 'text-muted hover:text-hl-sub'
    }`}
  >
    {props.label}
  </A>
)

export const Headbar = (): JSX.Element => {
  const { state } = useAuth()
  const location = useLocation()

  const profileActive = (): boolean => location.pathname.startsWith('/profile')
  const isAdmin = (): boolean => state.user?.role === 'admin' || state.user?.role === 'superadmin'

  const roleBorder = (): string => {
    const role = state.user?.role
    if (role === 'superadmin') return 'var(--role-super)'
    if (role === 'admin') return 'var(--role-admin)'
    return profileActive() ? 'var(--accent)' : 'var(--edge)'
  }

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
        <NavLink
          href="/"
          label="Problem List"
          active={location.pathname === '/' || location.pathname.startsWith('/quiz')}
        />
        <NavLink href="/leaderboard" label="Leaderboard" active={location.pathname.startsWith('/leaderboard')} />
        <NavLink href="/submissions" label="Submissions" active={location.pathname.startsWith('/submissions')} />
        <Show when={isAdmin()}>
          <NavLink href="/admin" label="Admin" active={location.pathname.startsWith('/admin')} />
        </Show>
        <A
          href="/profile"
          aria-label="Profile"
          title={`${state.user?.username ?? 'Guest'}${state.user?.role !== undefined && state.user.role !== 'user' ? ` · ${state.user.role}` : ''}`}
          class="ml-1.5 flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 bg-[radial-gradient(circle_at_30%_25%,var(--av1),var(--av2)_70%)] no-underline transition-[border-color,box-shadow] hover:shadow-[0_0_14px_var(--glow)]"
          style={{ 'border-color': roleBorder() }}
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
