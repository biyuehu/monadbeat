import { Route, Router } from '@solidjs/router'
import type { JSX } from 'solid-js'
import { Headbar } from './components/Headbar'
import { AuthCallbackRoute } from './routes/AuthCallbackRoute'
import { AdminRoute } from './routes/admin/AdminRoute'
import { LeaderboardRoute } from './routes/LeaderboardRoute'
import { ProblemsRoute } from './routes/ProblemsRoute'
import { ProfileRoute } from './routes/ProfileRoute'
import { QuizRoute } from './routes/QuizRoute'
import { SubmissionsRoute } from './routes/SubmissionsRoute'

export const App = (): JSX.Element => (
  <Router
    root={(props: { children?: JSX.Element }): JSX.Element => (
      <>
        <Headbar />
        {props.children}
      </>
    )}
  >
    <Route path="/" component={ProblemsRoute} />
    <Route path="/quiz/:id" component={QuizRoute} />
    <Route path="/auth/callback" component={AuthCallbackRoute} />
    <Route path="/leaderboard" component={LeaderboardRoute} />
    <Route path="/submissions" component={SubmissionsRoute} />
    <Route path="/profile" component={ProfileRoute} />
    <Route path="/admin" component={AdminRoute} />
  </Router>
)
