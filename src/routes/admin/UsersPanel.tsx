import { Effect } from 'effect'
import { createResource, createSignal, For, type JSX, Match, Show, Suspense, Switch } from 'solid-js'
import { Pagination } from '../../components/Pagination'
import { useAuth } from '../../context/auth'
import { useDialog } from '../../context/dialog'
import {
  adminBanUser,
  adminDemote,
  adminLiftBan,
  adminListBans,
  adminListUsers,
  adminPromote,
  type BanItem,
  type UserAdminItem
} from '../../lib/adminApi'

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

  const [users, { refetch: refetchUsers }] = createResource(() => Effect.runPromise(adminListUsers(props.token)))
  const [bans, { refetch: refetchBans }] = createResource(() => Effect.runPromise(adminListBans(props.token)))

  const [page, setPage] = createSignal(1)
  const pageSize = 12

  const [busy, setBusy] = createSignal<string | null>(null)
  const [err, setErr] = createSignal<string | null>(null)
  const [banTarget, setBanTarget] = createSignal<string | null>(null)
  const [banReason, setBanReason] = createSignal('')
  const [banExpiry, setBanExpiry] = createSignal('')

  const pagedUsers = (): UserAdminItem[] => {
    const list = users() ?? []
    const start = (page() - 1) * pageSize
    return list.slice(start, start + pageSize)
  }

  const withBusy = async (key: string, fn: () => Promise<unknown>): Promise<void> => {
    setBusy(key)
    setErr(null)
    try {
      await fn()
      await refetchUsers()
      await refetchBans()
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

  const liftBan = async (ban: BanItem): Promise<void> => {
    const ok = await dialog.confirm({
      title: 'Lift Ban',
      message: `Lift ban on "${ban.username}"?`,
      confirmText: 'Lift Ban'
    })
    if (!ok) return
    void withBusy(`ban-${ban.id}`, async () => {
      await Effect.runPromise(adminLiftBan(ban.id, props.token))
      dialog.toast(`Lifted ban on ${ban.username}`, 'success')
    })
  }

  return (
    <div class="flex flex-col gap-8">
      <Show when={err()}>
        <div class="text-xs text-red-400 bg-red-900/20 border border-red-800 rounded px-3 py-2">{err()}</div>
      </Show>

      {/* Users table */}
      <div class="flex flex-col gap-3">
        <span class="text-dim text-xs uppercase tracking-wider">Users</span>
        <Suspense fallback={<div class="text-dim text-sm">Loading…</div>}>
          <Switch>
            <Match when={users.error}>
              <div class="text-xs text-red-400">Failed: {String(users.error)}</div>
            </Match>
            <Match when={users()}>
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
                    <For each={pagedUsers()}>
                      {(u) => (
                        <tr>
                          <td class="flex items-center gap-2">
                            <Show when={u.avatar_url}>
                              <img class="size-5 rounded-full" src={u.avatar_url!} alt="" />
                            </Show>
                            <span class="font-mono text-xs text-soft">{u.username}</span>
                          </td>
                          <td>
                            <RoleBadge role={u.role} />
                          </td>
                          <td class="text-dim text-xs">{fmtDate(u.created_at)}</td>
                          <td class="flex gap-1.5">
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
                            <Show when={u.role !== 'superadmin' && u.username !== state.user?.username}>
                              <button
                                type="button"
                                class="btn-xs btn-danger"
                                disabled={busy() === u.username}
                                onClick={() => openBan(u)}
                              >
                                Ban
                              </button>
                            </Show>
                          </td>
                        </tr>
                      )}
                    </For>
                  </tbody>
                </table>
              </div>

              <Show when={(users() ?? []).length > 0}>
                <Pagination
                  page={page()}
                  pageSize={pageSize}
                  total={(users() ?? []).length}
                  onPageChange={(p) => setPage(p)}
                />
              </Show>
            </Match>
          </Switch>
        </Suspense>
      </div>

      {/* Active bans table */}
      <div class="flex flex-col gap-3">
        <span class="text-dim text-xs uppercase tracking-wider">Active Bans</span>
        <Suspense fallback={<div class="text-dim text-sm">Loading…</div>}>
          <Switch>
            <Match when={bans.error}>
              <div class="text-xs text-red-400">Failed: {String(bans.error)}</div>
            </Match>
            <Match when={(bans() ?? []).filter((b) => b.is_active).length === 0}>
              <div class="text-dim text-xs">No active bans.</div>
            </Match>
            <Match when={bans()}>
              <div class="overflow-x-auto">
                <table class="admin-table w-full text-sm">
                  <thead>
                    <tr>
                      <th>User</th>
                      <th>Reason</th>
                      <th>Banned</th>
                      <th>Expires</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    <For each={(bans() ?? []).filter((b) => b.is_active)}>
                      {(ban) => (
                        <tr>
                          <td class="font-mono text-xs text-soft">{ban.username}</td>
                          <td class="text-xs text-dim max-w-48 truncate" title={ban.reason}>
                            {ban.reason}
                          </td>
                          <td class="text-dim text-xs">{fmtDate(ban.banned_at)}</td>
                          <td class="text-dim text-xs">{fmtDate(ban.expires_at)}</td>
                          <td>
                            <button
                              type="button"
                              class="btn-xs btn-ok"
                              disabled={busy() === `ban-${ban.id}`}
                              onClick={() => liftBan(ban)}
                            >
                              Lift
                            </button>
                          </td>
                        </tr>
                      )}
                    </For>
                  </tbody>
                </table>
              </div>
            </Match>
          </Switch>
        </Suspense>
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
