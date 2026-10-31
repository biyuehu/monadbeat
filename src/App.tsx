import { Route, Router } from '@solidjs/router'
import type { JSX } from 'solid-js'
import { Headbar } from './components/Headbar'
import { KeyboardShortcutsModal } from './components/KeyboardShortcutsModal'
import { useGlobalShortcuts } from './lib/shortcuts'
import { AuthCallback } from './pages/AuthCallback'
import { Admin } from './pages/admin/Admin'
import { Leaderboard } from './pages/Leaderboard'
import { NotFound } from './pages/NotFound'
import { Problems } from './pages/Problems'
import { Profile } from './pages/Profile'
import { Quiz } from './pages/Quiz'
import { Submissions } from './pages/Submissions'

const AppRoot = (props: { children?: JSX.Element }): JSX.Element => {
  useGlobalShortcuts()
  return (
    <>
      <Headbar />
      {props.children}
      <KeyboardShortcutsModal />
    </>
  )
}

export const App = (): JSX.Element => (
  <Router root={AppRoot}>
    <Route path="/" component={Problems} />
    <Route path="/quiz/:id" component={Quiz} />
    <Route path="/auth/callback" component={AuthCallback} />
    <Route path="/leaderboard" component={Leaderboard} />
    <Route path="/submissions" component={Submissions} />
    <Route path="/profile" component={Profile} />
    <Route path="/admin" component={Admin} />
    <Route path="*404" component={NotFound} />
  </Router>
)
