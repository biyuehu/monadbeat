import { useNavigate } from '@solidjs/router'
import { Effect } from 'effect'
import { createSignal, For, type JSX, Show } from 'solid-js'
import { Frame } from '../components/Frame'
import { useAuth } from '../context/auth'
import { fetchProblems, fetchProgress } from '../lib/api'
import { applyTheme, theme } from '../lib/theme'
import type { ProblemListItem } from '../lib/types'

const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:8000'

type View = 'info' | 'done' | 'theme'

const navItems: { key: View; icon: string; label: string; needAuth: boolean }[] = [
  { key: 'info', icon: '👤', label: 'Profile', needAuth: false },
  { key: 'done', icon: '✅', label: 'Solved', needAuth: true },
  { key: 'theme', icon: '🎨', label: 'Appearance', needAuth: false }
]

const stars = (difficulty: number): string => Array.from({ length: 5 }, (_, i) => (i < difficulty ? '★' : '☆')).join('')

const roleColor = (role: string | undefined): string => {
  if (role === 'superadmin') return 'var(--role-super)'
  if (role === 'admin') return 'var(--role-admin)'
  return 'var(--accent)'
}

const goLogin = (): void => {
  window.location.href = `${API_BASE}/auth/github/login`
}

const ViewHeader = (props: { title: string; sub: string }): JSX.Element => (
  <div class="flex items-baseline gap-3 mb-5 pb-2.5 border-b border-sep">
    <span class="text-[1.15rem] font-bold tracking-tight text-accent">{props.title}</span>
    <span class="text-[0.62rem] uppercase tracking-wider text-dim">{props.sub}</span>
  </div>
)

const Welcome = (): JSX.Element => (
  <div class="flex flex-col items-center gap-1.5 px-2 py-8 text-center">
    <h1 class="mb-3 text-[2.2rem] sm:text-5xl font-bold leading-none tracking-[4px] md:tracking-[8px] text-accent [text-shadow:0_0_32px_var(--glow)]">
      WELCOME
    </h1>
    <p class="text-[0.78rem] md:text-[0.85rem] leading-7 tracking-wide text-muted">Hello, dear visitor.</p>
    <p class="text-[0.78rem] md:text-[0.85rem] leading-7 tracking-wide text-muted">
      A quiet place for Haskell practice.
    </p>
    <p class="text-[0.78rem] md:text-[0.85rem] leading-7 tracking-wide text-muted">
      Sign in with GitHub to keep track of every problem you solve.
    </p>
    <button type="button" class="btn mt-6 px-[22px] py-2 text-[0.7rem]" onClick={goLogin}>
      Sign in with GitHub
    </button>
  </div>
)

export const ProfileRoute = (): JSX.Element => {
  const { state: auth, signOut } = useAuth()
  const navigate = useNavigate()
  const [view, setView] = createSignal<View>('info')
  const [solved, setSolved] = createSignal<ReadonlySet<string>>(new Set())
  const [problems, setProblems] = createSignal<readonly ProblemListItem[]>([])

  Effect.runPromise(fetchProblems())
    .then(setProblems)
    .catch(() => setProblems([]))

  const loadSolved = (): void => {
    const token = auth.token
    if (token === null) {
      setSolved(new Set<string>())
      return
    }
    Effect.runPromise(fetchProgress(token))
      .then((items) => setSolved(new Set(items.filter((i) => i.status === 'correct').map((i) => i.problem_slug))))
      .catch(() => setSolved(new Set<string>()))
  }

  loadSolved()

  const visibleNav = (): typeof navItems => navItems.filter((i) => !i.needAuth || auth.user !== null)

  const solvedCount = (): number => solved().size

  const doneProblems = (): ProblemListItem[] => problems().filter((p) => solved().has(p.slug))

  return (
    <Frame title="Profile" flush class="md:flex-row md:overflow-hidden">
      <aside class="flex shrink-0 flex-col p-4 md:w-60 md:pt-6 bg-panel2 border-b md:border-b-0 md:border-r border-sep">
        <div class="flex items-center md:flex-col gap-3 md:gap-1.5 pb-4 md:pb-5 border-b border-sep">
          <div class="flex size-14.5 md:size-21.5 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-edge bg-[radial-gradient(circle_at_30%_25%,var(--av1),var(--av2)_70%)] transition-[border-color,box-shadow] hover:border-soft hover:shadow-[0_0_22px_var(--glow)]">
            <Show
              when={auth.user?.avatar_url}
              fallback={<span class="text-2xl md:text-4xl font-bold leading-none text-soft">λ</span>}
            >
              <img class="size-full object-cover block" src={auth.user?.avatar_url ?? ''} alt="avatar" />
            </Show>
          </div>
          <div
            class="min-w-0 max-w-full truncate text-[0.85rem] font-semibold tracking-wide md:mt-1"
            style={{ color: roleColor(auth.user?.role) }}
          >
            {auth.user?.username ?? 'Guest'}
          </div>
        </div>

        <nav class="flex flex-wrap md:flex-col gap-1.5 md:gap-1 py-4 md:flex-1 md:min-h-0 md:overflow-y-auto">
          <For each={visibleNav()}>
            {(item) => (
              <button
                type="button"
                class={`list-row gap-2.5 w-full max-md:flex-[1_1_calc(50%-6px)] px-3 py-2.5 text-left text-[0.78rem] tracking-wide font-[inherit] cursor-pointer border-y border-r border-y-transparent border-r-transparent ${
                  view() === item.key
                    ? 'bg-sel border-l-accent text-white'
                    : 'bg-row text-nav hover:bg-brand-tint hover:text-nav-hover'
                }`}
                onClick={() => {
                  setView(item.key)
                  if (item.key === 'done') loadSolved()
                }}
              >
                <span class="w-[1.1rem] shrink-0 text-center text-[0.85rem]">{item.icon}</span>
                <span class="flex-1 truncate">{item.label}</span>
              </button>
            )}
          </For>
        </nav>

        <Show when={auth.user !== null}>
          <div class="pt-4 border-t border-sep shrink-0">
            <button
              type="button"
              class="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-[0.78rem] tracking-wide font-[inherit] cursor-pointer bg-transparent text-err border border-err-line transition-colors hover:bg-err-bg hover:border-err active:scale-99"
              onClick={() => {
                signOut()
                navigate('/')
              }}
            >
              <span class="w-[1.1rem] shrink-0 text-center text-[0.85rem]">⎋</span>
              <span class="flex-1 truncate">Log out</span>
            </button>
          </div>
        </Show>
      </aside>

      <section class="min-w-0 flex-1 p-5 md:px-8 md:pt-6 md:pb-8 md:overflow-y-auto">
        <div class="mx-auto w-full max-w-2xl">
          <Show when={view() === 'info'}>
            <ViewHeader title="Profile" sub={auth.user === null ? 'Guest' : 'Profile'} />
            <Show when={auth.user !== null} fallback={<Welcome />}>
              <div class="grid grid-cols-[76px_1fr] sm:grid-cols-[96px_1fr] gap-0.5 p-1 border border-edge text-[0.75rem]">
                <div class="px-3 py-2.5 bg-row tracking-wide text-muted">Username</div>
                <div class="px-3 py-2.5 bg-row text-soft break-all">{auth.user?.username}</div>
                <div class="px-3 py-2.5 bg-row tracking-wide text-muted">Joined</div>
                <div class="px-3 py-2.5 bg-row text-fg break-all">{auth.user?.created_at}</div>
                <div class="px-3 py-2.5 bg-row tracking-wide text-muted">Role</div>
                <div class="px-3 py-2.5 bg-row font-semibold" style={{ color: roleColor(auth.user?.role) }}>
                  {auth.user?.role ?? 'user'}
                </div>
                <Show when={auth.user?.is_banned === true}>
                  <div class="px-3 py-2.5 bg-row tracking-wide text-muted">Status</div>
                  <div class="px-3 py-2.5 bg-row text-err">Banned</div>
                </Show>
                <div class="px-3 py-2.5 bg-row tracking-wide text-muted">Solved</div>
                <div class="px-3 py-2.5 bg-row text-fg">
                  {solvedCount()} / {problems().length}
                </div>
              </div>
            </Show>
          </Show>

          <Show when={view() === 'done'}>
            <ViewHeader title="Solved" sub={`${solvedCount()} / ${problems().length} Solved`} />
            <div class="list-box min-h-60">
              <Show
                when={doneProblems().length > 0}
                fallback={
                  <div class="empty-box flex-1">
                    <div class="empty-title">No solved problems yet</div>
                    <div class="empty-text">Solve a problem and it will show up here.</div>
                  </div>
                }
              >
                <For each={doneProblems()}>
                  {(problem) => (
                    <div class="group flex items-center gap-3.5 px-3 py-2 bg-row transition-colors hover:bg-hl">
                      <span class="w-5 shrink-0 text-center text-[0.85rem] text-ok">✓</span>
                      <span class="flex-1 min-w-0 truncate text-[0.78rem] text-text2 group-hover:text-hl-fg">
                        {problem.title}
                      </span>
                      <span class="chip max-[560px]:hidden group-hover:text-hl-tag group-hover:border-brand">
                        {problem.problem_type}
                      </span>
                      <span class="min-w-14 shrink-0 text-right text-[0.65rem] text-dim group-hover:text-hl-tag">
                        {stars(problem.difficulty)}
                      </span>
                    </div>
                  )}
                </For>
              </Show>
            </div>
          </Show>

          <Show when={view() === 'theme'}>
            <ViewHeader title="Appearance" sub="Appearance" />
            <div class="flex flex-col gap-3">
              <div class="section-label">Theme Mode</div>
              <div class="flex flex-wrap gap-2.5">
                <For each={['light', 'dark'] as const}>
                  {(mode) => (
                    <button
                      type="button"
                      class={`flex flex-col gap-2 flex-[1_1_150px] max-w-55 max-[420px]:max-w-full p-3.5 pb-3 text-left text-[0.75rem] tracking-wide font-[inherit] cursor-pointer border transition-colors hover:border-brand ${
                        theme() === mode
                          ? 'border-accent bg-brand-tint text-strong'
                          : 'border-field-line bg-row text-nav hover:text-nav-hover'
                      }`}
                      onClick={() => applyTheme(mode)}
                    >
                      <span
                        class={`flex h-13.5 items-center justify-center border text-[1.1rem] font-bold tracking-wide ${
                          mode === 'light'
                            ? 'bg-[#f5f3fa] text-[#4b3a70] border-[#d8d0e8]'
                            : 'bg-[#0a0a0a] text-soft border-[#3a2d55]'
                        }`}
                      >
                        λ
                      </span>
                      <span class="font-semibold">{mode === 'light' ? 'Light' : 'Dark'}</span>
                      <span class="text-[0.58rem] tracking-wide text-dim">
                        {mode === 'light' ? 'Light background · dark text' : 'Dark background · light text'}
                      </span>
                    </button>
                  )}
                </For>
              </div>
            </div>
          </Show>
        </div>
      </section>
    </Frame>
  )
}
