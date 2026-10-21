import { Effect } from 'effect'
import { createResource, createSignal, For, type JSX, Match, Show, Suspense, Switch } from 'solid-js'
import { Pagination } from '../../components/Pagination'
import { adminDeleteProblem, adminListProblems, adminPublishToggle, type ProblemAdminItem } from '../../lib/adminApi'
import { ProblemTypeLabel } from '../../lib/types'
import { ProblemFormModal } from './ProblemFormModal'

const stars = (n: number): string => '★'.repeat(n) + '☆'.repeat(5 - n)

export const ProblemsPanel = (props: { token: string }): JSX.Element => {
  const [problems, { refetch }] = createResource(() => Effect.runPromise(adminListProblems(props.token)))

  const [page, setPage] = createSignal(1)
  const pageSize = 12
  const [editing, setEditing] = createSignal<ProblemAdminItem | null>(null)
  const [creating, setCreating] = createSignal(false)
  const [busy, setBusy] = createSignal<string | null>(null)
  const [err, setErr] = createSignal<string | null>(null)

  const pagedProblems = (): ProblemAdminItem[] => {
    const list = problems() ?? []
    const start = (page() - 1) * pageSize
    return list.slice(start, start + pageSize)
  }

  const withBusy = async (key: string, fn: () => Promise<unknown>): Promise<void> => {
    setBusy(key)
    setErr(null)
    try {
      await fn()
      await refetch()
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(null)
    }
  }

  const togglePublish = (p: ProblemAdminItem): void => {
    void withBusy(p.slug, () => Effect.runPromise(adminPublishToggle(p.slug, !p.is_published, props.token)))
  }

  const deleteProblem = (p: ProblemAdminItem): void => {
    if (!confirm(`Delete "${p.title}"? This cannot be undone.`)) return
    void withBusy(p.slug, () => Effect.runPromise(adminDeleteProblem(p.slug, props.token)))
  }

  return (
    <div class="flex flex-col gap-4">
      <div class="flex items-center justify-between">
        <span class="text-dim text-xs uppercase tracking-wider">Problems</span>
        <button type="button" class="btn-sm btn-accent" onClick={() => setCreating(true)}>
          + New Problem
        </button>
      </div>

      <Show when={err()}>
        <div class="text-xs text-red-400 bg-red-900/20 border border-red-800 rounded px-3 py-2">{err()}</div>
      </Show>

      <Suspense fallback={<div class="text-dim text-sm">Loading…</div>}>
        <Switch>
          <Match when={problems.error}>
            <div class="text-xs text-red-400">Failed to load problems: {String(problems.error)}</div>
          </Match>
          <Match when={problems()}>
            <div class="overflow-x-auto">
              <table class="admin-table w-full text-sm">
                <thead>
                  <tr>
                    <th>Slug</th>
                    <th>Title</th>
                    <th>Type</th>
                    <th>Diff</th>
                    <th>Published</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <For each={pagedProblems()}>
                    {(p) => (
                      <tr class={p.is_published ? '' : 'opacity-50'}>
                        <td class="font-mono text-xs text-dim">{p.slug}</td>
                        <td class="font-medium text-soft max-w-48 truncate" title={p.title}>
                          {p.title}
                        </td>
                        <td class="text-dim text-xs">
                          {ProblemTypeLabel[p.problem_type as keyof typeof ProblemTypeLabel] ?? p.problem_type}
                        </td>
                        <td class="text-dim text-xs tracking-tighter">{stars(p.difficulty)}</td>
                        <td>
                          <button
                            type="button"
                            class={`btn-xs ${p.is_published ? 'btn-ok' : 'btn-muted'}`}
                            disabled={busy() === p.slug}
                            onClick={() => togglePublish(p)}
                          >
                            {p.is_published ? 'Live' : 'Draft'}
                          </button>
                        </td>
                        <td class="flex gap-1.5">
                          <button type="button" class="btn-xs btn-muted" onClick={() => setEditing(p)}>
                            Edit
                          </button>
                          <button
                            type="button"
                            class="btn-xs btn-danger"
                            disabled={busy() === p.slug}
                            onClick={() => deleteProblem(p)}
                          >
                            Del
                          </button>
                        </td>
                      </tr>
                    )}
                  </For>
                </tbody>
              </table>
            </div>

            <Show when={(problems() ?? []).length > 0}>
              <Pagination
                page={page()}
                pageSize={pageSize}
                total={(problems() ?? []).length}
                onPageChange={(p) => setPage(p)}
              />
            </Show>
          </Match>
        </Switch>
      </Suspense>

      <Show when={creating()}>
        <ProblemFormModal
          token={props.token}
          onClose={() => setCreating(false)}
          onSaved={() => {
            setCreating(false)
            void refetch()
          }}
        />
      </Show>

      <Show when={editing()}>
        {(p) => (
          <ProblemFormModal
            token={props.token}
            slug={p().slug}
            onClose={() => setEditing(null)}
            onSaved={() => {
              setEditing(null)
              void refetch()
            }}
          />
        )}
      </Show>
    </div>
  )
}
