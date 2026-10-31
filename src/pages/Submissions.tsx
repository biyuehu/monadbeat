import { A, useNavigate } from '@solidjs/router'
import { Effect, flow } from 'effect'
import { createEffect, createSignal, For, type JSX, onCleanup, onMount, Show } from 'solid-js'
import { fetchSubmissions } from '../api'
import { FooterLine, Frame } from '../components/Frame'
import { useAuth } from '../context/auth'
import { isInputElement } from '../lib/shortcuts'
import type { SubmissionListItem } from '../types'

type Filter = 'all' | 'correct' | 'wrong'

const filters: readonly { key: Filter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'correct', label: 'Correct' },
  { key: 'wrong', label: 'Wrong' }
]

const formatTime = (iso: string): string =>
  new Date(iso).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })

const formatFull = (iso: string): string => new Date(iso).toLocaleString()

const blockLabel = 'mb-1.5 text-[0.62rem] uppercase tracking-widest text-muted'

export const Submissions = (): JSX.Element => {
  const navigate = useNavigate()
  const { state: auth } = useAuth()
  const [items, setItems] = createSignal<readonly SubmissionListItem[]>([])
  const [page, setPage] = createSignal(1)
  const [hasMore, setHasMore] = createSignal(false)
  const pageSize = 15
  const [loading, setLoading] = createSignal(true)
  const [error, setError] = createSignal<string | null>(null)
  const [filter, setFilter] = createSignal<Filter>('all')
  const [openId, setOpenId] = createSignal<number | null>(null)
  const [selectedIndex, setSelectedIndex] = createSignal(0)

  // Cache pages and cursors: page 1 cursor is null
  const pageCursors = new Map<number, string | null>([[1, null]])
  const pageCache = new Map<number, { items: readonly SubmissionListItem[]; hasMore: boolean }>()

  const loadPage = (p: number): void => {
    const token = auth.token
    if (token === null) {
      setLoading(false)
      return
    }

    if (pageCache.has(p)) {
      const cached = pageCache.get(p)!
      setItems(cached.items)
      setHasMore(cached.hasMore)
      setPage(p)
      return
    }

    const cursor = pageCursors.get(p) ?? null
    setLoading(true)
    Effect.runPromise(fetchSubmissions(token, cursor, pageSize))
      .then((res) => {
        if (res.next_cursor && !pageCursors.has(p + 1)) {
          pageCursors.set(p + 1, res.next_cursor)
        }
        pageCache.set(p, { items: res.items, hasMore: res.has_more })
        setItems(res.items)
        setHasMore(res.has_more)
        setPage(p)
      })
      .catch(flow(String, setError))
      .finally(() => setLoading(false))
  }

  createEffect(() => {
    loadPage(page())
  })

  const visible = (): SubmissionListItem[] =>
    items().filter((i) => filter() === 'all' || (filter() === 'correct') === i.is_correct)

  const countOf = (key: Filter): number =>
    key === 'all' ? items().length : items().filter((i) => (key === 'correct') === i.is_correct).length

  const handleKeyDown = (e: KeyboardEvent): void => {
    if (isInputElement(e.target)) return
    const list = visible()
    const maxIdx = Math.max(0, list.length - 1)

    // J / Down: select next
    if (e.key === 'j' || e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((prev) => Math.min(prev + 1, maxIdx))
      return
    }

    // K / Up: select prev
    if (e.key === 'k' || e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((prev) => Math.max(prev - 1, 0))
      return
    }

    // Enter / Space: toggle open detail
    if (e.key === 'Enter' || e.key === ' ') {
      if (list.length > 0 && selectedIndex() < list.length) {
        e.preventDefault()
        const targetId = list[selectedIndex()].id
        setOpenId((prev) => (prev === targetId ? null : targetId))
      }
      return
    }

    // V: view problem / retry
    if (e.key === 'v') {
      if (list.length > 0 && selectedIndex() < list.length) {
        e.preventDefault()
        navigate(`/quiz/${list[selectedIndex()].problem_slug}`)
      }
      return
    }

    // F: cycle filter tab (all -> correct -> wrong)
    if (e.key === 'f') {
      e.preventDefault()
      const filterKeys: Filter[] = ['all', 'correct', 'wrong']
      const curIdx = filterKeys.indexOf(filter())
      const nextKey = filterKeys[(curIdx + 1) % filterKeys.length]
      setFilter(nextKey)
      setSelectedIndex(0)
      return
    }

    // [ / H: previous page
    if (e.key === '[' || e.key === 'h') {
      if (page() > 1) {
        e.preventDefault()
        loadPage(page() - 1)
        setSelectedIndex(0)
      }
      return
    }

    // ] / L: next page
    if (e.key === ']' || e.key === 'l') {
      if (hasMore()) {
        e.preventDefault()
        loadPage(page() + 1)
        setSelectedIndex(0)
      }
      return
    }
  }

  onMount(() => {
    window.addEventListener('keydown', handleKeyDown)
  })

  onCleanup(() => {
    window.removeEventListener('keydown', handleKeyDown)
  })

  return (
    <Frame title="Submissions">
      <div class="page-header items-baseline !mb-4">
        <span class="page-title text-2xl md:text-3xl">Submissions</span>
        <span class="text-[0.65rem] uppercase tracking-wider text-dim">Your recent attempts</span>
      </div>

      <div class="flex gap-1.5 w-full max-w-200 mx-auto mb-3 shrink-0">
        <For each={filters}>
          {(f) => (
            <button
              type="button"
              class={`px-3 py-1 text-[0.68rem] tracking-wide font-[inherit] cursor-pointer border transition-colors ${
                filter() === f.key
                  ? 'bg-brand text-white border-brand'
                  : 'bg-transparent text-ghost-fg border-ghost-line hover:border-brand hover:text-accent'
              }`}
              onClick={() => setFilter(f.key)}
            >
              {f.label} · {countOf(f.key)}
            </button>
          )}
        </For>
      </div>

      <div class="flex items-center gap-2 md:gap-3 w-full max-w-200 mx-auto pb-2 pl-[18px] pr-[15px] md:pl-[22px] md:pr-[19px] text-[0.65rem] uppercase tracking-widest text-muted shrink-0">
        <span class="w-6 shrink-0" />
        <span class="flex-1 min-w-0">Problem</span>
        <span class="w-44 shrink-0 max-md:hidden">Answer</span>
        <span class="w-32 shrink-0 text-right max-[560px]:hidden">Time</span>
        <span class="w-4 shrink-0" />
      </div>

      <div class="list-box flex-1 min-h-25 overflow-y-auto w-full max-w-200 mx-auto">
        <Show when={error() === null} fallback={<div class="status-text text-err">⚠️ {error()}</div>}>
          <Show when={!loading()} fallback={<div class="status-text text-dim">Loading...</div>}>
            <Show
              when={auth.token !== null}
              fallback={
                <div class="empty-box flex-1">
                  <div class="empty-title">Sign in required</div>
                  <div class="empty-text">Sign in to see your submission history.</div>
                  <A href="/profile" class="btn mt-2 px-[22px] py-2 text-[0.7rem]">
                    Go to Profile
                  </A>
                </div>
              }
            >
              <Show
                when={visible().length > 0}
                fallback={
                  <div class="empty-box flex-1">
                    <div class="empty-title">{items().length === 0 ? 'No submissions yet' : 'No matches'}</div>
                    <div class="empty-text">
                      {items().length === 0
                        ? 'Answer a problem and your attempts will show up here.'
                        : 'No submissions in this category.'}
                    </div>
                  </div>
                }
              >
                <For each={visible()}>
                  {(item, idx) => {
                    const open = (): boolean => openId() === item.id
                    const isSelected = (): boolean => selectedIndex() === idx()
                    return (
                      <div class="shrink-0">
                        <button
                          type="button"
                          class={`group list-row w-full min-w-0 gap-2 md:gap-3 px-2.5 py-2 md:px-3.5 md:py-2.5 text-left font-[inherit] cursor-pointer border-y-0 border-r-0 hover:bg-hl hover:border-l-hl-line ${
                            open()
                              ? 'bg-brand-tint border-l-accent'
                              : isSelected()
                                ? 'bg-sel border-l-accent'
                                : 'bg-row'
                          }`}
                          aria-expanded={open()}
                          onClick={() => {
                            setSelectedIndex(idx())
                            setOpenId(open() ? null : item.id)
                          }}
                        >
                          <span
                            class={`w-6 shrink-0 text-center text-base ${item.is_correct ? 'text-ok' : 'text-err'}`}
                          >
                            {item.is_correct ? '✓' : '✗'}
                          </span>
                          <span class="flex-1 min-w-0 truncate text-[0.9rem] font-medium tracking-tight text-text2 group-hover:text-hl-fg">
                            {item.problem_title}
                          </span>
                          <span class="w-44 shrink-0 truncate text-[0.7rem] text-dim max-md:hidden group-hover:text-hl-sub">
                            {item.user_answer}
                          </span>
                          <span class="w-32 shrink-0 text-right text-[0.65rem] whitespace-nowrap text-dim max-[560px]:hidden group-hover:text-hl-sub">
                            {formatTime(item.submitted_at)}
                          </span>
                          <span class="w-4 shrink-0 text-center text-[0.65rem] text-dim group-hover:text-hl-sub">
                            {open() ? '▾' : '▸'}
                          </span>
                        </button>

                        <Show when={open()}>
                          <div class="mt-0.5 flex flex-col gap-3 px-3.5 py-3 bg-field border border-sep border-l-3 border-l-edge text-[0.75rem]">
                            <div class="flex flex-wrap items-center justify-between gap-2">
                              <span
                                class={`px-2.5 py-0.5 text-[0.65rem] tracking-wide border ${
                                  item.is_correct ? 'border-ok text-ok bg-ok-bg' : 'border-err text-err bg-err-bg'
                                }`}
                              >
                                {item.is_correct ? 'Correct' : 'Wrong'}
                              </span>
                              <span class="text-[0.65rem] text-dim">
                                #{item.id} · {formatFull(item.submitted_at)}
                              </span>
                            </div>

                            <div>
                              <div class={blockLabel}>Your answer</div>
                              <pre class="m-0 p-2.5 overflow-x-auto whitespace-pre-wrap break-all font-[inherit] text-fg bg-row border border-sep">
                                {item.user_answer}
                              </pre>
                            </div>

                            <Show when={item.judge_detail}>
                              <div>
                                <div class={blockLabel}>Judge feedback</div>
                                <pre class="m-0 p-2.5 overflow-x-auto whitespace-pre-wrap break-words font-[inherit] text-err bg-err-bg border border-err-line">
                                  {item.judge_detail}
                                </pre>
                              </div>
                            </Show>

                            <div class="flex justify-end">
                              <button
                                type="button"
                                class="btn px-[18px] py-[7px] text-[0.7rem]"
                                onClick={() => navigate(`/quiz/${item.problem_slug}`)}
                              >
                                {item.is_correct ? 'View problem' : 'Try again'} →
                              </button>
                            </div>
                          </div>
                        </Show>
                      </div>
                    )
                  }}
                </For>
              </Show>
            </Show>
          </Show>
        </Show>
      </div>

      <Show when={page() > 1 || hasMore()}>
        <div class="flex items-center justify-between gap-3 pt-3 border-t border-sep text-xs text-dim shrink-0">
          <div>
            Page <span class="text-soft font-mono font-medium">{page()}</span>
          </div>
          <div class="flex items-center gap-1.5 font-mono">
            <button
              type="button"
              class="btn-xs btn-muted disabled:opacity-30 disabled:cursor-not-allowed"
              disabled={page() <= 1}
              onClick={() => loadPage(page() - 1)}
            >
              &lt; Prev
            </button>
            <button
              type="button"
              class="btn-xs btn-muted disabled:opacity-30 disabled:cursor-not-allowed"
              disabled={!hasMore()}
              onClick={() => loadPage(page() + 1)}
            >
              Next &gt;
            </button>
          </div>
        </div>
      </Show>

      <FooterLine class="!mt-4" right={`${items().length} on page`} />
    </Frame>
  )
}
