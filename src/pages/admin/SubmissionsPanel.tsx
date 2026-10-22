import { Effect } from 'effect'
import { createEffect, createSignal, For, type JSX, Show } from 'solid-js'
import { adminListSubmissions, type SubmissionAdminItem } from '../../api/admin'
import { Pagination } from '../../components/Pagination'

const formatTime = (iso: string): string =>
  new Date(iso).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })

export const SubmissionsPanel = (props: { token: string }): JSX.Element => {
  const [items, setItems] = createSignal<readonly SubmissionAdminItem[]>([])
  const [total, setTotal] = createSignal(0)
  const [loading, setLoading] = createSignal(true)
  const [page, setPage] = createSignal(1)
  const pageSize = 15

  const [filterUser, setFilterUser] = createSignal('')
  const [filterProblem, setFilterProblem] = createSignal('')
  const [filterCorrect, setFilterCorrect] = createSignal<'all' | 'true' | 'false'>('all')

  const [openId, setOpenId] = createSignal<number | null>(null)
  const [err, setErr] = createSignal<string | null>(null)

  // Cache pages keyed by `${filterUser}::${filterProblem}::${filterCorrect}::${page}`
  const pageCache = new Map<string, { items: readonly SubmissionAdminItem[]; total: number }>()

  const loadPage = (p: number, force = false): void => {
    const u = filterUser().trim()
    const prob = filterProblem().trim()
    const corr = filterCorrect()
    const isCorr = corr === 'all' ? undefined : corr === 'true'
    const cacheKey = `${u}::${prob}::${corr}::${p}`

    if (!force && pageCache.has(cacheKey)) {
      const cached = pageCache.get(cacheKey)!
      setItems(cached.items)
      setTotal(cached.total)
      setPage(p)
      return
    }

    setLoading(true)
    Effect.runPromise(
      adminListSubmissions(props.token, {
        page: p,
        pageSize,
        username: u || undefined,
        problemSlug: prob || undefined,
        isCorrect: isCorr
      })
    )
      .then((res) => {
        pageCache.set(cacheKey, { items: res.items, total: res.total })
        setItems(res.items)
        setTotal(res.total)
        setPage(res.page)
      })
      .catch((e) => setErr(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false))
  }

  // Reload when filters change
  createEffect(() => {
    filterUser()
    filterProblem()
    filterCorrect()
    setPage(1)
    loadPage(1)
  })

  // Watch page changes
  createEffect(() => {
    loadPage(page())
  })

  return (
    <div class="flex flex-col gap-4">
      {/* Header and Filters */}
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <span class="text-dim text-xs uppercase tracking-wider">All Submissions</span>

        <div class="flex flex-wrap items-center gap-2">
          <input
            type="text"
            class="input-field text-xs h-7 py-1 px-2 w-32"
            placeholder="Filter User…"
            value={filterUser()}
            onInput={(e) => setFilterUser(e.currentTarget.value)}
          />
          <input
            type="text"
            class="input-field text-xs h-7 py-1 px-2 w-36"
            placeholder="Filter Problem…"
            value={filterProblem()}
            onInput={(e) => setFilterProblem(e.currentTarget.value)}
          />
          <select
            class="input-field text-xs h-7 py-0.5 px-2 bg-panel2"
            value={filterCorrect()}
            onChange={(e) => setFilterCorrect(e.currentTarget.value as 'all' | 'true' | 'false')}
          >
            <option value="all">Status: All</option>
            <option value="true">Status: Correct</option>
            <option value="false">Status: Wrong</option>
          </select>
        </div>
      </div>

      <Show when={err()}>
        <div class="text-xs text-red-400 bg-red-900/20 border border-red-800 rounded px-3 py-2">{err()}</div>
      </Show>

      <Show when={loading() && items().length === 0}>
        <div class="text-dim text-sm">Loading submissions…</div>
      </Show>

      <Show when={!loading() || items().length > 0}>
        <div class="overflow-x-auto">
          <table class="admin-table w-full text-sm">
            <thead>
              <tr>
                <th>User</th>
                <th>Problem</th>
                <th>Status</th>
                <th>Time</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              <Show
                when={items().length > 0}
                fallback={
                  <tr>
                    <td colspan={5} class="text-center py-6 text-dim text-xs">
                      No submissions found.
                    </td>
                  </tr>
                }
              >
                <For each={items()}>
                  {(sub) => (
                    <>
                      <tr class="hover:bg-row">
                        <td>
                          <div class="flex items-center gap-2">
                            <Show when={sub.user_avatar}>
                              <img class="size-4.5 rounded-full object-cover shrink-0" src={sub.user_avatar!} alt="" />
                            </Show>
                            <a
                              href={`https://github.com/${sub.username}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              class="font-mono text-xs text-soft font-semibold hover:underline flex items-center gap-1 transition-opacity hover:opacity-80"
                              title={`View ${sub.username}'s GitHub`}
                            >
                              <span>{sub.username}</span>
                              <svg
                                viewBox="0 0 16 16"
                                width="10"
                                height="10"
                                fill="currentColor"
                                class="shrink-0 opacity-40"
                                aria-hidden="true"
                              >
                                <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
                              </svg>
                            </a>
                          </div>
                        </td>
                        <td>
                          <div class="flex flex-col">
                            <span class="font-medium text-fg text-xs truncate max-w-44" title={sub.problem_title}>
                              {sub.problem_title}
                            </span>
                            <span class="font-mono text-[0.65rem] text-dim">{sub.problem_slug}</span>
                          </div>
                        </td>
                        <td>
                          <span
                            class={`inline-block px-1.5 py-0.5 text-[0.68rem] font-bold rounded ${
                              sub.is_correct
                                ? 'bg-ok-bg text-ok border border-ok/40'
                                : 'bg-err-bg text-err border border-err/40'
                            }`}
                          >
                            {sub.is_correct ? '✓ Correct' : '× Wrong'}
                          </span>
                        </td>
                        <td class="text-dim text-xs whitespace-nowrap">{formatTime(sub.submitted_at)}</td>
                        <td>
                          <button
                            type="button"
                            class="btn-xs btn-muted"
                            onClick={() => setOpenId(openId() === sub.id ? null : sub.id)}
                          >
                            {openId() === sub.id ? 'Hide' : 'Details'}
                          </button>
                        </td>
                      </tr>

                      {/* Expandable details */}
                      <Show when={openId() === sub.id}>
                        <tr class="bg-field/40">
                          <td colspan={5} class="p-3">
                            <div class="flex flex-col gap-2 text-xs">
                              <div>
                                <span class="text-dim uppercase text-[0.65rem] font-bold tracking-wider block mb-1">
                                  User Answer:
                                </span>
                                <pre class="p-2 bg-black/50 border border-sep rounded text-fg font-mono overflow-x-auto whitespace-pre-wrap text-[0.75rem]">
                                  {sub.user_answer}
                                </pre>
                              </div>
                              <Show when={sub.judge_detail}>
                                <div>
                                  <span class="text-dim uppercase text-[0.65rem] font-bold tracking-wider block mb-1">
                                    Judge Detail:
                                  </span>
                                  <pre class="p-2 bg-black/50 border border-sep rounded text-err font-mono overflow-x-auto whitespace-pre-wrap text-[0.75rem]">
                                    {sub.judge_detail}
                                  </pre>
                                </div>
                              </Show>
                            </div>
                          </td>
                        </tr>
                      </Show>
                    </>
                  )}
                </For>
              </Show>
            </tbody>
          </table>
        </div>

        <Show when={total() > 0}>
          <Pagination page={page()} pageSize={pageSize} total={total()} onPageChange={(p) => setPage(p)} />
        </Show>
      </Show>
    </div>
  )
}
