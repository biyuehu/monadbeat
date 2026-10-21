import { Effect } from 'effect'
import { createEffect, createSignal, For, type JSX, Show } from 'solid-js'
import { adminBanUser, adminDemote, adminListUsers, adminPromote, type UserAdminItem } from '../../api/admin'
import { Pagination } from '../../components/Pagination'
import { useAuth } from '../../context/auth'
import { useDialog } from '../../context/dialog'

const fmtDate = (d: string | null | undefined): string => {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

const RoleBadge = (props: { role: string }): JSX.Element => {
  const cls = (): string => {
    if (props.role === 'superadmin') return 'badge-super'
    if (props.role === 'admin') return 'badge-admin'
    return 'badge-user'
  }
  return <span class={`badge ${cls()}`}>{props.role}</span>
}

export const UsersPanel = (props: { token: string }): JSX.Element => {
  const { state } = useAuth()
  const dialog = useDialog()
  const isSuperadmin = (): boolean => state.user?.role === 'superadmin'

  const [items, setItems] = createSignal<readonly UserAdminItem[]>([])
  const [total, setTotal] = createSignal(0)
  const [loading, setLoading] = createSignal(true)
  const [page, setPage] = createSignal(1)
  const pageSize = 12

  const [busy, setBusy] = createSignal<string | null>(null)
  const [err, setErr] = createSignal<string | null>(null)
  const [banTarget, setBanTarget] = createSignal<string | null>(null)
  const [banReason, setBanReason] = createSignal('')
  const [banExpiry, setBanExpiry] = createSignal('')

  // Cache pages so navigating back does not re-fetch
  const pageCache = new Map<number, { items: readonly UserAdminItem[]; total: number }>()

  const loadPage = (p: number, force = false): void => {
    if (!force && pageCache.has(p)) {
      const cached = pageCache.get(p)!
      setItems(cached.items)
      setTotal(cached.total)
      setPage(p)
      return
    }

    setLoading(true)
    Effect.runPromise(adminListUsers(props.token, p, pageSize))
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

  const promote = async (u: UserAdminItem): Promise<void> => {
    const ok = await dialog.confirm({
      title: 'Promote User',
      message: `Promote "${u.username}" to admin?`,
      confirmText: 'Promote'
    })
    if (!ok) return
    void withBusy(u.username, async () => {
      await Effect.runPromise(adminPromote(u.username, props.token))
      dialog.toast(`Promoted ${u.username} to admin`, 'success')
    })
  }

  const demote = async (u: UserAdminItem): Promise<void> => {
    const ok = await dialog.confirm({
      title: 'Demote User',
      message: `Demote "${u.username}" from admin to normal user?`,
      confirmText: 'Demote',
      danger: true
    })
    if (!ok) return
    void withBusy(u.username, async () => {
      await Effect.runPromise(adminDemote(u.username, props.token))
      dialog.toast(`Demoted ${u.username} to user`, 'info')
    })
  }

  const openBan = (u: UserAdminItem): void => {
    setBanTarget(u.username)
    setBanReason('')
    setBanExpiry('')
  }

  const submitBan = (): void => {
    const target = banTarget()
    if (!target || !banReason().trim()) return
    const body = {
      reason: banReason().trim(),
      expires_at: banExpiry() ? new Date(banExpiry()).toISOString() : undefined
    }
    void withBusy(target, async () => {
      await Effect.runPromise(adminBanUser(target, body, props.token))
      setBanTarget(null)
      dialog.toast(`User ${target} has been banned`, 'warning')
    })
  }

  return (
    <div class="flex flex-col gap-6">
      <Show when={err()}>
        <div class="text-xs text-red-400 bg-red-900/20 border border-red-800 rounded px-3 py-2">{err()}</div>
      </Show>

      {/* Users table */}
      <div class="flex flex-col gap-3">
        <span class="text-dim text-xs uppercase tracking-wider">Users</span>
        <Show when={loading() && items().length === 0}>
          <div class="text-dim text-sm">Loading…</div>
        </Show>

        <Show when={!loading() || items().length > 0}>
          <div class="overflow-x-auto">
            <table class="admin-table w-full text-sm">
              <thead>
                <tr>
                  <th>Username</th>
                  <th>Role</th>
                  <th>Joined</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                <For each={items()}>
                  {(u) => (
                    <tr>
                      <td>
                        <div class="flex items-center gap-2 min-h-6">
                          <Show when={u.avatar_url}>
                            <img class="size-5 rounded-full object-cover shrink-0" src={u.avatar_url!} alt="" />
                          </Show>
                          <span class="font-mono text-xs text-soft">{u.username}</span>
                        </div>
                      </td>
                      <td>
                        <RoleBadge role={u.role} />
                      </td>
                      <td class="text-dim text-xs">{fmtDate(u.created_at)}</td>
                      <td>
                        <div class="flex items-center gap-1.5 min-h-6">
                          <Show when={isSuperadmin() && u.role === 'user'}>
                            <button
                              type="button"
                              class="btn-xs btn-muted"
                              disabled={busy() === u.username}
                              onClick={() => promote(u)}
                            >
                              Promote
                            </button>
                          </Show>
                          <Show when={isSuperadmin() && u.role === 'admin'}>
                            <button
                              type="button"
                              class="btn-xs btn-muted"
                              disabled={busy() === u.username}
                              onClick={() => demote(u)}
                            >
                              Demote
                            </button>
                          </Show>
                          <button
                            type="button"
                            class="btn-xs btn-danger"
                            title={
                              u.role === 'superadmin' || u.username === state.user?.username
                                ? 'Cannot ban superadmin or yourself'
                                : u.role === 'admin' && state.user?.role !== 'superadmin'
                                  ? 'Only superadmin can ban admins'
                                  : undefined
                            }
                            disabled={
                              !(
                                u.role !== 'superadmin' &&
                                u.username !== state.user?.username &&
                                (u.role !== 'admin' || state.user?.role === 'superadmin')
                              ) || busy() === u.username
                            }
                            onClick={() => openBan(u)}
                          >
                            Ban
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
      </div>

      {/* Ban modal */}
      <Show when={banTarget()}>
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div class="terminal p-6 flex flex-col gap-4 w-full max-w-sm">
            <div class="font-bold text-soft">
              Ban <span class="text-accent font-mono">{banTarget()}</span>
            </div>
            <label class="flex flex-col gap-1">
              <span class="text-xs text-dim">Reason *</span>
              <textarea
                class="input-field h-20 resize-none"
                value={banReason()}
                onInput={(e) => setBanReason(e.currentTarget.value)}
                placeholder="Reason for ban…"
              />
            </label>
            <label class="flex flex-col gap-1">
              <span class="text-xs text-dim">Expires (optional)</span>
              <input
                class="input-field"
                type="datetime-local"
                value={banExpiry()}
                onInput={(e) => setBanExpiry(e.currentTarget.value)}
              />
            </label>
            <div class="flex gap-2 justify-end">
              <button type="button" class="btn-sm btn-muted" onClick={() => setBanTarget(null)}>
                Cancel
              </button>
              <button
                type="button"
                class="btn-sm btn-danger"
                disabled={!banReason().trim() || busy() === banTarget()}
                onClick={submitBan}
              >
                Ban User
              </button>
            </div>
          </div>
        </div>
      </Show>
    </div>
  )
}
