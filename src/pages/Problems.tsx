import { useNavigate } from '@solidjs/router'
import { Effect, flow } from 'effect'
import { createEffect, createSignal, For, type JSX, Show } from 'solid-js'
import { fetchProblems, fetchProgress } from '../api'
import { FilterPanel } from '../components/FilterPanel'
import { FooterLine, Frame } from '../components/Frame'
import { Pagination } from '../components/Pagination'
import { useAuth } from '../context/auth'
import { useFilter } from '../context/filter'
import {
  isProblemType,
  type ProblemListItem,
  type ProblemType,
  ProblemTypeLabel,
  ProblemTypeOrder,
  type ProgressItem
} from '../types'

const stars = (difficulty: number): string => Array.from({ length: 5 }, (_, i) => (i < difficulty ? '★' : '☆')).join('')

type Status = 'todo' | 'correct' | 'first_correct' | 'wrong'

const statusStyle: Record<Status, { icon: string; icon2: string; iconCls: string; chipCls: string }> = {
  todo: { icon: '🔘', icon2: '-', iconCls: 'text-faint', chipCls: 'border-chip-line text-dim bg-row' },
  first_correct: { icon: '🔵', icon2: '★', iconCls: 'text-accent', chipCls: 'border-accent text-accent bg-brand-bg' },
  correct: { icon: '🟢', icon2: '√', iconCls: 'text-ok', chipCls: 'border-ok text-ok bg-ok-bg' },
  wrong: { icon: '🔴', icon2: '×', iconCls: 'text-err', chipCls: 'border-err text-err bg-err-bg' }
}

const statusLabel = (status: Status, attempts: number): string => `${statusStyle[status].icon2} ${attempts}`

const statusTitle = (status: Status, attempts: number): string => {
  if (status === 'todo') return `Not attempted · 0 attempts`
  if (status === 'first_correct') return `Solved on 1st attempt! · ${attempts} attempt${attempts === 1 ? '' : 's'}`
  if (status === 'correct') return `Solved · ${attempts} attempt${attempts === 1 ? '' : 's'}`
  return `Not solved yet · ${attempts} attempt${attempts === 1 ? '' : 's'}`
}

export const Problems = (): JSX.Element => {
  const navigate = useNavigate()
  const { state: auth } = useAuth()
  const { state: filter, isFiltering } = useFilter()
  const [items, setItems] = createSignal<readonly ProblemListItem[]>([])
  const [total, setTotal] = createSignal(0)
  const [progress, setProgress] = createSignal<ReadonlyMap<string, ProgressItem>>(new Map())
  const [loading, setLoading] = createSignal(true)
  const [error, setError] = createSignal<string | null>(null)
  const [filterOpen, setFilterOpen] = createSignal(false)
  const [search, setSearch] = createSignal('')
  const [page, setPage] = createSignal(1)
  const pageSize = 15

  // Cache pages keyed by `${search}::${activeTypes}::${page}`
  const pageCache = new Map<string, { items: readonly ProblemListItem[]; total: number }>()

  const activeTypes = (): string[] => ProblemTypeOrder.filter((t) => filter.types[t as ProblemType])

  const loadProblems = (p: number): void => {
    const s = search().trim()
    const types = activeTypes()
    const cacheKey = `${s}::${types.join(',')}::${p}`

    if (pageCache.has(cacheKey)) {
      const cached = pageCache.get(cacheKey)!
      setItems(cached.items)
      setTotal(cached.total)
      setLoading(false)
      return
    }

    setLoading(true)
    Effect.runPromise(fetchProblems(p, pageSize, s, types))
      .then((res) => {
        pageCache.set(cacheKey, { items: res.items, total: res.total })
        setItems(res.items)
        setTotal(res.total)
      })
      .catch(flow(String, setError))
      .finally(() => setLoading(false))
  }

  createEffect(() => {
    // When search or filter changes, reset to page 1
    search()
    activeTypes()
    setPage(1)
  })

  createEffect(() => {
    loadProblems(page())
  })

  const token = auth.token
  if (token !== null) {
    Effect.runPromise(fetchProgress(token))
      .then((items) => setProgress(new Map(items.map((i) => [i.problem_slug, i]))))
      .catch(() => setProgress(new Map()))
  }

  const statusOf = (slug: string): { status: Status; attempts: number } => {
    const item = progress().get(slug)
    if (item === undefined) return { status: 'todo', attempts: 0 }
    if (item.first_attempt_correct) {
      return { status: 'first_correct', attempts: item.attempts }
    }
    return { status: item.status, attempts: item.attempts }
  }

  // Filter items on current page by status (todo / correct / wrong)
  const displayItems = (): readonly ProblemListItem[] =>
    items().filter((p) => {
      const st = statusOf(p.slug).status
      if (st === 'todo') return filter.status.todo
      if (st === 'correct' || st === 'first_correct') return filter.status.correct
      if (st === 'wrong') return filter.status.wrong
      return true
    })

  const countText = (): string => {
    if (loading()) return 'Loading...'
    return `${total()} problems`
  }

  return (
    <Frame title="Monad Beat">
      <div class="page-header items-center">
        <span class="page-title text-2xl md:text-3xl">Problem List</span>
        <div class="flex items-center gap-2 flex-1 min-w-50 max-w-105 max-md:basis-full max-md:max-w-none">
          <button
            type="button"
            class={`inline-flex size-8 shrink-0 items-center justify-center p-0 cursor-pointer border transition-colors hover:bg-brand hover:text-white active:scale-97 ${
              isFiltering() ? 'bg-brand text-white border-accent' : 'bg-transparent text-soft border-brand'
            }`}
            aria-label="Filter problems"
            onClick={() => setFilterOpen(true)}
          >
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" class="block fill-current">
              <path d="M3 4h18l-7 8.5V19l-4 2v-8.5L3 4z" />
            </svg>
          </button>
          <div class="flex flex-1 min-w-0 h-8 items-center gap-1.5 pl-3 pr-1 bg-field border border-field-line transition-colors focus-within:border-brand">
            <svg
              viewBox="0 0 24 24"
              width="18"
              height="18"
              role="img"
              aria-label="Search"
              class="shrink-0 fill-current text-muted"
            >
              <title>Search</title>
              <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
            </svg>
            <input
              type="text"
              class="flex-1 min-w-0 px-1 text-[0.85rem] bg-transparent border-0 outline-none text-fg placeholder:text-dim"
              placeholder="FINDING WHAT"
              value={search()}
              onInput={(e) => setSearch(e.currentTarget.value)}
            />
            <button type="button" class="btn h-6 shrink-0 px-3.5 text-[0.62rem] whitespace-nowrap">
              Search
            </button>
          </div>
        </div>
      </div>

      <div class="flex items-center justify-between mb-3 px-1 shrink-0">
        <span class="text-xs font-medium uppercase tracking-wider text-strong">📋 All Problems</span>
        <span class="px-3 py-0.5 text-xs text-accent bg-panel border border-countline">{countText()}</span>
      </div>

      <Show when={error() !== null}>
        <div class="status-text text-err">⚠️ {error()}</div>
      </Show>

      <div class="flex items-center gap-2 md:gap-3 w-full max-w-200 mx-auto pb-2 pl-[18px] pr-[15px] md:pl-[22px] md:pr-[19px] text-[0.65rem] uppercase tracking-widest text-muted shrink-0">
        <span class="w-6 shrink-0" />
        <span class="flex-1 min-w-0">Title</span>
        <span class="w-32 max-md:w-24 shrink-0 text-right">Type</span>
        <span class="w-16 shrink-0 text-right max-[560px]:hidden">Diff</span>
        <span class="w-[4.2rem] max-md:w-14 shrink-0 text-center">Tries</span>
      </div>

      <div class="list-box flex-1 min-h-25 overflow-y-auto w-full max-w-200 mx-auto">
        <Show when={!loading()} fallback={<div class="status-text text-dim">⏳ Loading problems...</div>}>
          <Show when={!loading() && (total() === 0 || displayItems().length === 0)} fallback={null}>
            <div class="empty-box flex-1">
              <div class="empty-title">No matches</div>
              <div class="empty-text">No problems match your filter or search.</div>
            </div>
          </Show>

          <For each={displayItems()}>
            {(problem) => {
              const st = (): { status: Status; attempts: number } => statusOf(problem.slug)
              return (
                <button
                  type="button"
                  class="group list-row min-w-0 shrink-0 gap-2 md:gap-3 px-2.5 py-2 md:px-3.5 md:py-2.5 bg-row text-left font-[inherit] cursor-pointer border-y-0 border-r-0 hover:bg-hl hover:border-l-hl-line"
                  onClick={() => navigate(`/quiz/${problem.slug}`)}
                >
                  <span class="w-6 shrink-0 text-center text-base">{statusStyle[st().status].icon}</span>
                  <span
                    title={problem.title}
                    class="flex-1 min-w-0 truncate max-[420px]:whitespace-normal text-[0.95rem] max-[420px]:text-[0.85rem] font-medium tracking-tight text-text2 group-hover:text-hl-fg"
                  >
                    {problem.title}
                  </span>
                  <div class="flex w-32 max-md:w-24 min-w-0 shrink-0 justify-end">
                    <span class="chip group-hover:text-hl-tag group-hover:border-brand">
                      {isProblemType(problem.problem_type)
                        ? ProblemTypeLabel[problem.problem_type]
                        : problem.problem_type}
                    </span>
                  </div>
                  <span class="w-16 shrink-0 text-right text-[0.65rem] whitespace-nowrap text-dim max-[560px]:hidden group-hover:text-hl-sub">
                    {stars(problem.difficulty)}
                  </span>
                  <span
                    class={`w-[4.2rem] max-md:w-14 shrink-0 py-0.5 text-center text-[0.65rem] tracking-wide whitespace-nowrap border ${statusStyle[st().status].chipCls}`}
                    title={statusTitle(st().status, st().attempts)}
                  >
                    {statusLabel(st().status, st().attempts)}
                  </span>
                </button>
              )
            }}
          </For>
        </Show>
      </div>

      <Show when={total() > 0}>
        <Pagination page={page()} pageSize={pageSize} total={total()} onPageChange={(p) => setPage(p)} />
      </Show>

      <FooterLine class="!mt-4" right={`${ProblemTypeOrder.length} types · Haskell Practice`} />

      <FilterPanel open={filterOpen()} onClose={() => setFilterOpen(false)} />
    </Frame>
  )
}
