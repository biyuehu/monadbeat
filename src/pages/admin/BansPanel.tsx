import { Effect } from 'effect'
import { createResource, createSignal, For, type JSX, Match, Show, Suspense, Switch } from 'solid-js'
import { adminLiftBan, adminListBans, type BanItem } from '../../api/admin'
import { useDialog } from '../../context/dialog'

const fmtDate = (d: string | null | undefined): string => {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

export const BansPanel = (props: { token: string }): JSX.Element => {
  const dialog = useDialog()
  const [bans, { refetch }] = createResource(() => Effect.runPromise(adminListBans(props.token)))
  const [busy, setBusy] = createSignal<string | null>(null)
  const [err, setErr] = createSignal<string | null>(null)

  const liftBan = async (ban: BanItem): Promise<void> => {
    const ok = await dialog.confirm({
      title: 'Lift Ban',
      message: `Lift ban on "${ban.username}"?`,
      confirmText: 'Lift Ban'
    })
    if (!ok) return
    setBusy(`ban-${ban.id}`)
    setErr(null)
    try {
      await Effect.runPromise(adminLiftBan(ban.id, props.token))
      dialog.toast(`Lifted ban on ${ban.username}`, 'success')
      await refetch()
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(null)
    }
  }

  return (
    <div class="flex flex-col gap-4">
      <div class="flex items-center justify-between">
        <span class="text-dim text-xs uppercase tracking-wider">Active Bans</span>
      </div>

      <Show when={err()}>
        <div class="text-xs text-red-400 bg-red-900/20 border border-red-800 rounded px-3 py-2">{err()}</div>
      </Show>

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
  )
}
