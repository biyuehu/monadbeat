import { Route, Router } from '@solidjs/router'
import type { JSX } from 'solid-js'
import { Headbar } from './components/Headbar'
import { AuthCallback } from './pages/AuthCallback'
import { Admin } from './pages/admin/Admin'
import { Leaderboard } from './pages/Leaderboard'
import { NotFound } from './pages/NotFound'
import { Problems } from './pages/Problems'
import { Profile } from './pages/Profile'
import { Quiz } from './pages/Quiz'
import { Submissions } from './pages/Submissions'

export const App = (): JSX.Element => (
  <Router
    root={(props: { children?: JSX.Element }): JSX.Element => (
      <>
        <Headbar />
        {props.children}
      </>
    )}
  >
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
