import { useNavigate } from '@solidjs/router'
import { Effect } from 'effect'
import { createSignal, For, type JSX, Show } from 'solid-js'
import { fetchAllProblems, fetchProgress } from '../api'
import { Frame } from '../components/Frame'
import { Pagination } from '../components/Pagination'
import { useAuth } from '../context/auth'
import { findName, inferName, setFindName, setInferName } from '../lib/identity'
import { applyTheme, theme } from '../lib/theme'
import type { ProblemListItem, ProgressItem } from '../types'

const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:8000'

type View = 'info' | 'done' | 'theme'

const navItems: { key: View; icon: string; label: string; needAuth: boolean }[] = [
  { key: 'info', icon: '👤', label: 'Profile', needAuth: false },
  { key: 'done', icon: '✅', label: 'Solved', needAuth: true },
  { key: 'theme', icon: '🎨', label: 'Appearance', needAuth: false }
]

const stars = (difficulty: number): string => Array.from({ length: 5 }, (_, i) => (i < difficulty ? '★' : '☆')).join('')

const formatDate = (iso: string | undefined): string => {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

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

export const Profile = (): JSX.Element => {
  const { state: auth, signOut } = useAuth()
  const navigate = useNavigate()
  const [view, setView] = createSignal<View>('info')
  const [solved, setSolved] = createSignal<ReadonlyMap<string, ProgressItem>>(new Map())
  const [problems, setProblems] = createSignal<readonly ProblemListItem[]>([])
  const [donePage, setDonePage] = createSignal(1)
  const donePageSize = 12

  Effect.runPromise(fetchAllProblems())
    .then(setProblems)
    .catch(() => setProblems([]))

  const loadSolved = (): void => {
    const token = auth.token
    if (token === null) {
      setSolved(new Map<string, ProgressItem>())
      return
    }
    Effect.runPromise(fetchProgress(token))
      .then((items) => setSolved(new Map(items.filter((i) => i.status === 'correct').map((i) => [i.problem_slug, i]))))
      .catch(() => setSolved(new Map<string, ProgressItem>()))
  }

  loadSolved()

  const visibleNav = (): typeof navItems => navItems.filter((i) => !i.needAuth || auth.user !== null)

  const solvedCount = (): number => solved().size
  const firstTryCount = (): number => Array.from(solved().values()).filter((i) => i.first_attempt_correct).length

  const doneProblems = (): ProblemListItem[] => problems().filter((p) => solved().has(p.slug))

  const pagedDoneProblems = (): ProblemListItem[] => {
    const list = doneProblems()
    const start = (donePage() - 1) * donePageSize
    return list.slice(start, start + donePageSize)
  }

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
          <div class="flex items-center gap-1.5 md:mt-1 max-w-full">
            <Show
              when={auth.user?.username}
              fallback={
                <span class="min-w-0 max-w-full truncate text-[0.85rem] font-semibold tracking-wide text-dim">
                  Guest
                </span>
              }
            >
              {(name) => (
                <a
                  href={`https://github.com/${name()}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="View GitHub Profile"
                  class="min-w-0 max-w-full truncate text-[0.85rem] font-semibold tracking-wide no-underline hover:underline flex items-center gap-1 transition-opacity hover:opacity-80"
                  style={{ color: roleColor(auth.user?.role) }}
                >
                  <span>{name()}</span>
                  <svg
                    viewBox="0 0 16 16"
                    width="12"
                    height="12"
                    fill="currentColor"
                    class="shrink-0 opacity-60"
                    aria-hidden="true"
                  >
                    <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
                  </svg>
                </a>
              )}
            </Show>
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
                <div class="px-3 py-2.5 bg-row text-fg break-all">{formatDate(auth.user?.created_at)}</div>
                <div class="px-3 py-2.5 bg-row tracking-wide text-muted">Role</div>
                <div class="px-3 py-2.5 bg-row font-semibold" style={{ color: roleColor(auth.user?.role) }}>
                  {auth.user?.role ?? 'user'}
                </div>
                <Show when={auth.user?.is_banned === true}>
                  <div class="px-3 py-2.5 bg-row tracking-wide text-muted">Status</div>
                  <div class="px-3 py-2.5 bg-row text-err">Banned</div>
                </Show>
                <div class="px-3 py-2.5 bg-row tracking-wide text-muted">Solved</div>
                <div class="px-3 py-2.5 bg-row text-fg flex items-center gap-2">
                  <span>
                    {solvedCount()} / {problems().length}
                  </span>
                  <Show when={firstTryCount() > 0}>
                    <span
                      class="text-xs text-accent bg-brand-bg border border-accent/40 rounded px-1.5 py-0.2"
                      title="Solved on first attempt"
                    >
                      🔵 {firstTryCount()} 1st try
                    </span>
                  </Show>
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
                <For each={pagedDoneProblems()}>
                  {(problem) => {
                    const prog = () => solved().get(problem.slug)
                    const isFirst = () => prog()?.first_attempt_correct ?? false
                    return (
                      <button
                        type="button"
                        class="group flex w-full items-center gap-3.5 px-3 py-2 bg-row text-left font-[inherit] cursor-pointer border-0 border-b border-sep transition-colors hover:bg-hl"
                        onClick={() => navigate(`/quiz/${problem.slug}`)}
                      >
                        <span
                          class={`w-5 shrink-0 text-center text-[0.85rem] ${isFirst() ? 'text-accent' : 'text-ok'}`}
                          title={isFirst() ? 'Solved on 1st attempt! (🔵)' : 'Solved (🟢)'}
                        >
                          {isFirst() ? '★' : '✓'}
                        </span>
                        <span class="flex-1 min-w-0 truncate text-[0.78rem] text-text2 group-hover:text-hl-fg">
                          {problem.title}
                        </span>
                        <Show when={isFirst()}>
                          <span class="text-[0.62rem] text-accent font-semibold px-1 py-0.2 bg-brand-bg border border-accent/40 rounded">
                            🔵 1st try
                          </span>
                        </Show>
                        <span class="chip max-[560px]:hidden group-hover:text-hl-tag group-hover:border-brand">
                          {problem.problem_type}
                        </span>
                        <span class="min-w-14 shrink-0 text-right text-[0.65rem] text-dim group-hover:text-hl-tag">
                          {stars(problem.difficulty)}
                        </span>
                      </button>
                    )
                  }}
                </For>
              </Show>
            </div>

            <Show when={doneProblems().length > 0}>
              <Pagination
                page={donePage()}
                pageSize={donePageSize}
                total={doneProblems().length}
                onPageChange={(p) => setDonePage(p)}
              />
            </Show>
          </Show>

          <Show when={view() === 'theme'}>
            <ViewHeader title="Appearance & Preferences" sub="Appearance & Preferences" />
            <div class="flex flex-col gap-6">
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

              <div class="flex flex-col gap-3 pt-4 border-t border-sep">
                <div class="section-label">Quiz Function Identity</div>
                <p class="text-[0.75rem] text-muted leading-relaxed">
                  Customize the function name rendered in quizzes. Purely aesthetic and decoupled from backend
                  evaluation.
                </p>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div class="flex flex-col gap-1.5">
                    <label for="infer-name-input" class="text-[0.7rem] uppercase tracking-wider text-dim">
                      Infer Type Name (default: f)
                    </label>
                    <input
                      id="infer-name-input"
                      type="text"
                      class="px-3 py-2 bg-panel border border-field-line text-[0.8rem] text-fg font-mono focus:border-accent focus:outline-none"
                      value={inferName()}
                      onInput={(e) => setInferName(e.currentTarget.value)}
                      placeholder="f"
                    />
                    <span class="text-[0.65rem] text-dim font-mono">renders as: {inferName()} :: ...</span>
                  </div>
                  <div class="flex flex-col gap-1.5">
                    <label for="find-name-input" class="text-[0.7rem] uppercase tracking-wider text-dim">
                      Find Function Name (default: target)
                    </label>
                    <input
                      id="find-name-input"
                      type="text"
                      class="px-3 py-2 bg-panel border border-field-line text-[0.8rem] text-fg font-mono focus:border-accent focus:outline-none"
                      value={findName()}
                      onInput={(e) => setFindName(e.currentTarget.value)}
                      placeholder="target"
                    />
                    <span class="text-[0.65rem] text-dim font-mono">renders as: {findName()} = ...</span>
                  </div>
                </div>
              </div>

              <div class="flex flex-col gap-3 pt-4 border-t border-sep">
                <div class="section-label">Quiz Function Identity</div>
                <p class="text-[0.75rem] text-muted leading-relaxed">
                  Customize the function name rendered in quizzes. Purely aesthetic and decoupled from backend
                  evaluation.
                </p>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div class="flex flex-col gap-1.5">
                    <label for="infer-name-input" class="text-[0.7rem] uppercase tracking-wider text-dim">
                      Infer Type Name (default: f)
                    </label>
                    <input
                      id="infer-name-input"
                      type="text"
                      class="px-3 py-2 bg-panel border border-field-line text-[0.8rem] text-fg font-mono focus:border-accent focus:outline-none"
                      value={inferName()}
                      onInput={(e) => setInferName(e.currentTarget.value)}
                      placeholder="f"
                    />
                    <span class="text-[0.65rem] text-dim font-mono">renders as: {inferName()} :: ...</span>
                  </div>
                  <div class="flex flex-col gap-1.5">
                    <label for="find-name-input" class="text-[0.7rem] uppercase tracking-wider text-dim">
                      Find Function Name (default: target)
                    </label>
                    <input
                      id="find-name-input"
                      type="text"
                      class="px-3 py-2 bg-panel border border-field-line text-[0.8rem] text-fg font-mono focus:border-accent focus:outline-none"
                      value={findName()}
                      onInput={(e) => setFindName(e.currentTarget.value)}
                      placeholder="target"
                    />
                    <span class="text-[0.65rem] text-dim font-mono">renders as: {findName()} = ...</span>
                  </div>
                </div>
              </div>
            </div>
          </Show>
        </div>
      </section>
    </Frame>
  )
}
