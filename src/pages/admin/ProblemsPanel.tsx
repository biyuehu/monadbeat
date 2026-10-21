import { Effect } from 'effect'
import { createEffect, createSignal, For, type JSX, Show } from 'solid-js'
import { adminDeleteProblem, adminListProblems, adminPublishToggle, type ProblemAdminItem } from '../../api/admin'
import { Pagination } from '../../components/Pagination'
import { useDialog } from '../../context/dialog'
import { ProblemTypeLabel } from '../../types'
import { ProblemFormModal } from './ProblemFormModal'

const stars = (n: number): string => '★'.repeat(n) + '☆'.repeat(5 - n)

export const ProblemsPanel = (props: { token: string }): JSX.Element => {
  const dialog = useDialog()
  const [items, setItems] = createSignal<readonly ProblemAdminItem[]>([])
  const [total, setTotal] = createSignal(0)
  const [loading, setLoading] = createSignal(true)
  const [page, setPage] = createSignal(1)
  const pageSize = 12
  const [editing, setEditing] = createSignal<ProblemAdminItem | null>(null)
  const [creating, setCreating] = createSignal(false)
  const [busy, setBusy] = createSignal<string | null>(null)
  const [err, setErr] = createSignal<string | null>(null)

  // Cache pages so navigating back does not re-fetch
  const pageCache = new Map<number, { items: readonly ProblemAdminItem[]; total: number }>()

  const loadPage = (p: number, force = false): void => {
    if (!force && pageCache.has(p)) {
      const cached = pageCache.get(p)!
      setItems(cached.items)
      setTotal(cached.total)
      setPage(p)
      return
    }

    setLoading(true)
    Effect.runPromise(adminListProblems(props.token, p, pageSize))
      .then((res) => {
        pageCache.set(p, { items: res.items, total: res.total })
        setItems(res.items)
        setTotal(res.total)
        setPage(res.page)
      })
      .catch((e) => setErr(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false))
  }

  const reload = (): void => {
    pageCache.clear()
    loadPage(page(), true)
  }

  createEffect(() => {
    loadPage(page())
  })

  const withBusy = async (key: string, fn: () => Promise<unknown>): Promise<void> => {
    setBusy(key)
    setErr(null)
    try {
      await fn()
      reload()
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(null)
    }
  }

  const togglePublish = (p: ProblemAdminItem): void => {
    void withBusy(p.slug, () => Effect.runPromise(adminPublishToggle(p.slug, !p.is_published, props.token)))
  }

  const deleteProblem = async (p: ProblemAdminItem): Promise<void> => {
    const ok = await dialog.confirm({
      title: 'Delete Problem',
      message: `Are you sure you want to delete "${p.title}" (${p.slug})?\nThis action cannot be undone.`,
      confirmText: 'Delete',
      danger: true
    })
    if (!ok) return
    void withBusy(p.slug, async () => {
      await Effect.runPromise(adminDeleteProblem(p.slug, props.token))
      dialog.toast(`Problem "${p.title}" deleted`, 'success')
    })
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

      <Show when={loading() && items().length === 0}>
        <div class="text-dim text-sm">Loading…</div>
      </Show>

      <Show when={!loading() || items().length > 0}>
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
              <For each={items()}>
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
                    <td>
                      <div class="flex items-center gap-1.5 min-h-6">
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
                      </div>
                    </td>
                  </tr>
                )}
              </For>
            </tbody>
          </table>
        </div>

        <Show when={total() > 0}>
          <Pagination page={page()} pageSize={pageSize} total={total()} onPageChange={(p) => setPage(p)} />
        </Show>
      </Show>

      <Show when={creating()}>
        <ProblemFormModal
          token={props.token}
          onClose={() => setCreating(false)}
          onSaved={() => {
            setCreating(false)
            reload()
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
              reload()
            }}
          />
        )}
      </Show>
    </div>
  )
}
