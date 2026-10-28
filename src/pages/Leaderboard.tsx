import { Effect, flow } from 'effect'
import { createEffect, createSignal, For, type JSX, Show } from 'solid-js'
import { fetchLeaderboard, type LeaderboardTimeframe } from '../api'
import { FooterLine, Frame } from '../components/Frame'
import { LoadingIndicator } from '../components/LoadingIndicator'
import { Pagination } from '../components/Pagination'
import { useAuth } from '../context/auth'
import type { LeaderboardItem } from '../types'

const rankColor = (rank: number): string => {
  if (rank === 1) return 'text-warn'
  if (rank === 2) return 'text-slate-300'
  if (rank === 3) return 'text-orange-400'
  return 'text-dim group-hover:text-hl-fg'
}

const timeframes: readonly { key: LeaderboardTimeframe; label: string }[] = [
  { key: 'all', label: 'All Time' },
  { key: 'month', label: 'This Month' },
  { key: 'week', label: 'This Week' }
]

export const Leaderboard = (): JSX.Element => {
  const { state: auth } = useAuth()
  const [timeframe, setTimeframe] = createSignal<LeaderboardTimeframe>('all')
  const [entries, setEntries] = createSignal<readonly LeaderboardItem[]>([])
  const [error, setError] = createSignal<string | null>(null)
  const [loading, setLoading] = createSignal(true)
  const [page, setPage] = createSignal(1)
  const pageSize = 20

  createEffect(() => {
    const tf = timeframe()
    setLoading(true)
    setError(null)
    setPage(1)
    Effect.runPromise(fetchLeaderboard(tf))
      .then(setEntries)
      .catch(flow(String, setError))
      .finally(() => setLoading(false))
  })

  const pagedEntries = (): LeaderboardItem[] => {
    const list = entries()
    const start = (page() - 1) * pageSize
    return list.slice(start, start + pageSize)
  }

  const isMe = (entry: LeaderboardItem): boolean => auth.user !== null && auth.user.username === entry.username

  return (
    <Frame title="Leaderboard">
      <div class="page-header items-center justify-between !mb-5 flex-wrap gap-3">
        <div class="flex items-baseline gap-3">
          <span class="page-title text-3xl">Leaderboard</span>
          <span class="text-[0.65rem] uppercase tracking-wider text-dim">Top players</span>
        </div>

        <div class="flex items-center gap-1 bg-field p-1 border border-field-line rounded">
          <For each={timeframes}>
            {(tf) => (
              <button
                type="button"
                class={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
                  timeframe() === tf.key ? 'bg-brand text-white shadow-sm' : 'text-dim hover:text-soft bg-transparent'
                }`}
                onClick={() => setTimeframe(tf.key)}
              >
                {tf.label}
              </button>
            )}
          </For>
        </div>
      </div>

      <div class="flex items-center gap-2 md:gap-3 w-full max-w-200 mx-auto pb-2 pl-5 pr-[17px] md:pl-[22px] md:pr-[19px] text-[0.65rem] uppercase tracking-widest text-muted shrink-0">
        <span class="w-10 shrink-0">#</span>
        <span class="flex-1 min-w-0">User</span>
        <span class="w-16 md:w-22 shrink-0 text-right">Solved</span>
        <span class="w-20 shrink-0 text-right max-[420px]:hidden">Score</span>
      </div>

      <div class="list-box flex-1 min-h-25 overflow-y-auto w-full max-w-200 mx-auto">
        <Show when={error() === null} fallback={<div class="status-text text-err">⚠️ {error()}</div>}>
          <Show
            when={entries().length > 0}
            fallback={
              <Show when={!loading()} fallback={<LoadingIndicator text="Loading rankings..." class="py-16" />}>
                <div class="empty-box flex-1">
                  <div class="empty-title">No players yet</div>
                  <div class="empty-text">Solve a problem to get on the board.</div>
                </div>
              </Show>
            }
          >
            <For each={pagedEntries()}>
              {(entry) => (
                <div
                  class={`group list-row gap-2 md:gap-3 px-3 py-2.5 md:px-3.5 hover:bg-hl hover:border-l-hl-line ${
                    isMe(entry) ? 'bg-brand-tint border-l-accent' : 'bg-row'
                  }`}
                >
                  <span class={`w-10 shrink-0 text-[0.8rem] font-bold transition-colors ${rankColor(entry.rank)}`}>
                    #{entry.rank}
                  </span>
                  <span class="flex-1 min-w-0 truncate text-[0.85rem] text-text2 transition-colors group-hover:text-hl-fg">
                    {entry.username}
                    <Show when={isMe(entry)}>
                      <span class="ml-2 px-1.5 py-px text-[0.6rem] tracking-wide text-accent border border-brand">
                        me
                      </span>
                    </Show>
                  </span>
                  <span class="w-16 md:w-22 shrink-0 text-right text-[0.72rem] max-[420px]:text-[0.65rem] text-ok">
                    ✔ {entry.solved_count}
                  </span>
                  <span class="w-20 shrink-0 text-right text-[0.72rem] text-soft max-[420px]:hidden group-hover:text-hl-fg">
                    {entry.score} pt
                  </span>
                </div>
              )}
            </For>
          </Show>
        </Show>
      </div>

      <Show when={entries().length > 0}>
        <div class="w-full max-w-200 mx-auto">
          <Pagination page={page()} pageSize={pageSize} total={entries().length} onPageChange={(p) => setPage(p)} />
        </div>
      </Show>

      <FooterLine class="!mt-4" right={`Total ${entries().length} players`} />
    </Frame>
  )
}
