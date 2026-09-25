import { useNavigate } from '@solidjs/router'
import { Effect } from 'effect'
import { createSignal, For, type JSX, Show } from 'solid-js'
import { FilterPanel } from '../components/FilterPanel'
import { RouteTitle } from '../components/RouteTitle'
import { useAuth } from '../context/auth'
import { useFilter } from '../context/filter'
import { fetchProblems } from '../lib/api'
import { type Problem, ProblemTypeLabel, ProblemTypeOrder } from '../lib/schema'

const stars = (difficulty: number): string => Array.from({ length: 3 }, (_, i) => (i < difficulty ? '★' : '☆')).join('')

export const ProblemsRoute = (): JSX.Element => {
  const navigate = useNavigate()
  const { state: auth } = useAuth()
  const { state: filter, isFiltering } = useFilter()
  const [problems, setProblems] = createSignal<readonly Problem[]>([])
  const [error, setError] = createSignal<string | null>(null)
  const [filterOpen, setFilterOpen] = createSignal(false)
  const [search, setSearch] = createSignal('')

  Effect.runPromise(fetchProblems)
    .then(setProblems)
    .catch((e) => setError(String(e)))

  const visible = (): Problem[] =>
    problems()
      .filter((p) => filter[p.problem_type])
      .filter((p) => p.title.toLowerCase().includes(search().toLowerCase()))

  return (
    <Show
      when={auth.user !== null}
      fallback={
        <div class="mainFrame">
          <RouteTitle>Monad Beat</RouteTitle>
          <div class="terminal">
            <div class="emptyNotice">
              <div class="emptyTitle">Sign in required</div>
              <div class="emptyText">Please sign in to browse the question list.</div>
              <a class="emptyBtn" href="/account">
                Sign in
              </a>
            </div>
          </div>
        </div>
      }
    >
      <div class="mainFrame">
        <RouteTitle>Monad Beat</RouteTitle>
        <div class="terminal">
          <div class="header">
            <span class="title">Question List</span>
            <div class="searchFrame">
              <button
                type="button"
                class="filter-btn"
                classList={{ active: isFiltering() }}
                aria-label="Filter questions"
                onClick={() => setFilterOpen(true)}
              >
                <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                  <path d="M3 4h18l-7 8.5V19l-4 2v-8.5L3 4z" />
                </svg>
              </button>
              <div class="search-box">
                <span class="search-icon">
                  <svg viewBox="0 0 24 24" width="20" height="20" role="img" aria-label="Search">
                    <title>Search</title>
                    <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
                  </svg>
                </span>
                <input
                  type="text"
                  class="search-input"
                  placeholder="FINDING WHAT"
                  value={search()}
                  onInput={(e) => setSearch(e.currentTarget.value)}
                />
                <button type="button" class="search-btn">
                  Search
                </button>
              </div>
            </div>
          </div>

          <div class="listHeader">
            <span class="listLabel">📋 All Questions</span>
            <span class="listCount">
              {visible().length === problems().length
                ? `${problems().length} questions`
                : `${visible().length} / ${problems().length} questions`}
            </span>
          </div>

          <Show when={error() !== null} fallback={null}>
            <div class="error-text">⚠️ {error()}</div>
          </Show>

          <div class="problem-grid">
            <For each={visible()}>
              {(problem) => (
                <button type="button" class="problemItem" onClick={() => navigate(`/quiz/${problem.id}`)}>
                  <span class="p-status">○</span>
                  <span class="p-id">{problem.id}</span>
                  <span class="p-title">{problem.title}</span>
                  <div class="p-tags">
                    <span class="p-tag">{ProblemTypeLabel[problem.problem_type]}</span>
                  </div>
                  <span class="p-diff">Difficulty: {stars(problem.difficulty)}</span>
                  <span class="p-state undo">Todo</span>
                </button>
              )}
            </For>
          </div>

          <div class="footerLine">
            <span>λ Monad Beat</span>
            <span>{ProblemTypeOrder.length} types · Haskell Practice</span>
          </div>

          <FilterPanel open={filterOpen()} onClose={() => setFilterOpen(false)} />
        </div>
      </div>
    </Show>
  )
}
