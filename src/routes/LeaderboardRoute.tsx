import { Effect } from 'effect'
import { createSignal, For, type JSX, Show } from 'solid-js'
import { RouteTitle } from '../components/RouteTitle'
import { useAuth } from '../context/auth'
import { fetchLeaderboard } from '../lib/api'
import type { LeaderboardEntry } from '../lib/schema'

export const LeaderboardRoute = (): JSX.Element => {
  const { state: auth } = useAuth()
  const [entries, setEntries] = createSignal<readonly LeaderboardEntry[]>([])
  const [error, setError] = createSignal<string | null>(null)

  Effect.runPromise(fetchLeaderboard)
    .then(setEntries)
    .catch((e) => setError(String(e)))

  const rowClass = (entry: LeaderboardEntry): string => {
    const rankClass = entry.rank === 1 ? 'top1' : entry.rank === 2 ? 'top2' : entry.rank === 3 ? 'top3' : ''
    const meClass = auth.user !== null && auth.user.username === entry.username ? 'me' : ''
    return ['row', rankClass, meClass].filter((s) => s !== '').join(' ')
  }

  return (
    <div class="mainFrame">
      <RouteTitle>Leaderboard</RouteTitle>
      <div class="terminal">
        <div class="header">
          <span class="title">Leaderboard</span>
          <span class="subtitle">Leaderboard</span>
        </div>

        <div class="boardHead">
          <span class="col-rank">#</span>
          <span class="col-user">User</span>
          <span class="col-solved">Solved</span>
          <span class="col-score">Score</span>
        </div>

        <div class="board">
          <Show when={error() === null} fallback={<div class="error-text">⚠️ {error()}</div>}>
            <Show when={entries().length > 0} fallback={<div class="loading-text">Loading...</div>}>
              <For each={entries()}>
                {(entry) => (
                  <div class={rowClass(entry)}>
                    <span class="rank">#{entry.rank}</span>
                    <span class="user">
                      {entry.username}
                      {auth.user !== null && auth.user.username === entry.username ? (
                        <span class="meTag">me</span>
                      ) : null}
                    </span>
                    <span class="solved">✔ {entry.solved_count}</span>
                    <span class="score">{entry.score} pt</span>
                  </div>
                )}
              </For>
            </Show>
          </Show>
        </div>

        <div class="footerLine">
          <span>λ Monad Beat</span>
          <span>Total {entries().length} players</span>
        </div>
      </div>
    </div>
  )
}
