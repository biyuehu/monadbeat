import { useNavigate } from '@solidjs/router'
import { createSignal, type JSX, Match, onMount, Show, Switch } from 'solid-js'
import { Frame } from '../../components/Frame'
import { useAuth } from '../../context/auth'
import { BansPanel } from './BansPanel'
import { ProblemsPanel } from './ProblemsPanel'
import { UsersPanel } from './UsersPanel'

type Tab = 'problems' | 'users' | 'bans'

export const Admin = (): JSX.Element => {
  const { state } = useAuth()
  const navigate = useNavigate()
  const [tab, setTab] = createSignal<Tab>('problems')

  onMount(() => {
    const role = state.user?.role
    if (role !== 'admin' && role !== 'superadmin') {
      navigate('/', { replace: true })
    }
  })

  return (
    <Frame title="Admin">
      <Show
        when={state.user?.role === 'admin' || state.user?.role === 'superadmin'}
        fallback={<div class="text-dim text-sm">Access denied.</div>}
      >
        <div class="flex flex-col gap-6">
          {/* Header */}
          <div class="flex items-baseline justify-between border-b border-sep pb-3">
            <span class="text-[1.1rem] font-bold tracking-tight text-accent">Admin Panel</span>
            <span class="text-xs text-dim font-mono">
              {state.user?.username} · {state.user?.role}
            </span>
          </div>

          {/* Tabs */}
          <div class="flex gap-1 border-b border-sep">
            {(
              [
                { id: 'problems', label: '📋 Problems' },
                { id: 'users', label: '👥 Users' },
                { id: 'bans', label: '🚫 Bans' }
              ] as const
            ).map((t) => (
              <button
                type="button"
                class={`px-4 py-1.5 text-sm transition-colors border-b-2 -mb-px ${
                  tab() === t.id ? 'border-accent text-accent' : 'border-transparent text-dim hover:text-soft'
                }`}
                onClick={() => setTab(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Panel */}
          <Switch>
            <Match when={tab() === 'problems'}>
              <Show when={state.token}>{(token) => <ProblemsPanel token={token()} />}</Show>
            </Match>
            <Match when={tab() === 'users'}>
              <Show when={state.token}>{(token) => <UsersPanel token={token()} />}</Show>
            </Match>
            <Match when={tab() === 'bans'}>
              <Show when={state.token}>{(token) => <BansPanel token={token()} />}</Show>
            </Match>
          </Switch>
        </div>
      </Show>
    </Frame>
  )
}
