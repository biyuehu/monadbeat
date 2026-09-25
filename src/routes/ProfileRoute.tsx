import { Effect } from 'effect'
import { createSignal, For, type JSX, Show } from 'solid-js'
import { RouteTitle } from '../components/RouteTitle'
import { useAuth } from '../context/auth'
import { fetchProblems, fetchProgress } from '../lib/api'
import type { Problem, Progress } from '../lib/schema'
import { applyTheme, theme } from '../lib/theme'

type View = 'info' | 'done' | 'theme'

const navItems: { key: View; icon: string; label: string }[] = [
  { key: 'info', icon: '👤', label: 'Profile' },
  { key: 'done', icon: '✅', label: 'Solved' },
  { key: 'theme', icon: '🎨', label: 'Appearance' }
]

const stars = (difficulty: number): string => Array.from({ length: 3 }, (_, i) => (i < difficulty ? '★' : '☆')).join('')

export const ProfileRoute = (): JSX.Element => {
  const { state: auth, signOut } = useAuth()
  const [view, setView] = createSignal<View>('info')
  const [progress, setProgress] = createSignal<readonly Progress[]>([])
  const [problems, setProblems] = createSignal<readonly Problem[]>([])

  Effect.runPromise(fetchProblems)
    .then(setProblems)
    .catch(() => setProblems([]))
  Effect.runPromise(fetchProgress)
    .then(setProgress)
    .catch(() => setProgress([]))

  const myProgress = (): Progress[] => {
    const user = auth.user
    if (user === null) return []
    return progress().filter((p) => p.user_id === user.id)
  }

  const solvedCount = (): number => myProgress().filter((p) => p.status === 'solved').length

  const doneProblems = (): Problem[] => {
    const solvedIds = new Set(
      myProgress()
        .filter((p) => p.status === 'solved')
        .map((p) => p.problem_id)
    )
    return problems().filter((p) => solvedIds.has(p.id))
  }

  return (
    <div class="mainFrame">
      <RouteTitle>Profile</RouteTitle>
      <div class="terminal profileTerminal">
        <aside class="profileSide">
          <div class="profileAvatarWrap">
            <div class="profileAvatar">
              <Show when={auth.user?.avatar_url} fallback={<span class="profileAvatarFallback">λ</span>}>
                <img src={auth.user?.avatar_url ?? ''} alt="avatar" />
              </Show>
            </div>
            <div class="profileName">{auth.user?.username ?? 'Guest'}</div>
            <div class="profileEmail">{auth.user?.github_id ?? '--'}</div>
          </div>

          <nav class="profileNav">
            <For each={navItems}>
              {(item) => (
                <button
                  type="button"
                  class="profileNavBtn"
                  classList={{ active: view() === item.key }}
                  onClick={() => setView(item.key)}
                >
                  <span class="navIcon">{item.icon}</span>
                  <span class="navText">{item.label}</span>
                </button>
              )}
            </For>
          </nav>

          <div class="profileLogoutWrap">
            <button
              type="button"
              class="profileLogoutBtn"
              onClick={() => {
                signOut()
              }}
            >
              <span class="navIcon">⎋</span>
              <span class="navText">Log out</span>
            </button>
          </div>
        </aside>

        <section class="profileContent">
          <Show when={view() === 'info'}>
            <div class="viewHeader">
              <span class="viewTitle">Profile</span>
              <span class="viewSub">Profile</span>
            </div>
            <Show
              when={auth.user !== null}
              fallback={
                <div class="emptyNotice">
                  <div class="emptyText">Not signed in</div>
                </div>
              }
            >
              <div class="infoGrid">
                <div class="infoKey">Username</div>
                <div class="infoVal mono">{auth.user?.username}</div>
                <div class="infoKey">Github ID</div>
                <div class="infoVal mono">{auth.user?.github_id}</div>
                <div class="infoKey">User ID</div>
                <div class="infoVal mono">{auth.user?.id}</div>
                <div class="infoKey">Joined</div>
                <div class="infoVal">{auth.user?.created_at}</div>
                <div class="infoKey">Admin</div>
                <div class="infoVal">{auth.user?.is_admin === true ? 'yes' : 'no'}</div>
                <div class="infoKey">Solved</div>
                <div class="infoVal">
                  {solvedCount()} / {problems().length}
                </div>
              </div>
            </Show>
          </Show>

          <Show when={view() === 'done'}>
            <div class="viewHeader">
              <span class="viewTitle">Solved</span>
              <span class="viewSub">
                {solvedCount()} / {problems().length} Solved
              </span>
            </div>
            <div class="doneList">
              <For each={doneProblems()}>
                {(problem) => (
                  <div class="doneRow">
                    <span class="doneCheck">✓</span>
                    <span class="doneId">#{problem.id}</span>
                    <span class="doneTitle">{problem.title}</span>
                    <span class="doneType">{problem.problem_type}</span>
                    <span class="doneStars">{stars(problem.difficulty)}</span>
                  </div>
                )}
              </For>
            </div>
          </Show>

          <Show when={view() === 'theme'}>
            <div class="viewHeader">
              <span class="viewTitle">Appearance</span>
              <span class="viewSub">Appearance</span>
            </div>
            <div class="themeSection">
              <div class="themeLabel">Theme Mode</div>
              <div class="themeOptions">
                <button
                  type="button"
                  class="themeCard"
                  classList={{ active: theme() === 'light' }}
                  onClick={() => applyTheme('light')}
                >
                  <span class="themePreview light">λ</span>
                  <span class="themeCardName">Light</span>
                  <span class="themeCardDesc">Light background · dark text</span>
                </button>
                <button
                  type="button"
                  class="themeCard"
                  classList={{ active: theme() === 'dark' }}
                  onClick={() => applyTheme('dark')}
                >
                  <span class="themePreview dark">λ</span>
                  <span class="themeCardName">Dark</span>
                  <span class="themeCardDesc">Dark background · light text</span>
                </button>
              </div>
            </div>
          </Show>
        </section>
      </div>
    </div>
  )
}
