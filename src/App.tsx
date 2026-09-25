import { MetaProvider } from '@solidjs/meta'
import { Route, Router } from '@solidjs/router'
import type { JSX } from 'solid-js'
import { Headbar } from './components/Headbar'
import { AuthProvider } from './context/auth'
import { FilterProvider } from './context/filter'
import { AccountRoute } from './routes/AccountRoute'
import { LeaderboardRoute } from './routes/LeaderboardRoute'
import { ProblemsRoute } from './routes/ProblemsRoute'
import { ProfileRoute } from './routes/ProfileRoute'
import { QuizRoute } from './routes/QuizRoute'

const Layout = (props: { children?: JSX.Element }): JSX.Element => (
  <>
    <Headbar />
    {props.children}
  </>
)

export const App = (): JSX.Element => (
  <Router root={Layout}>
    <Route path="/" component={ProblemsRoute} />
    <Route path="/quiz/:id" component={QuizRoute} />
    <Route path="/account" component={AccountRoute} />
    <Route path="/leaderboard" component={LeaderboardRoute} />
    <Route path="/profile" component={ProfileRoute} />
  </Router>
)

export const Root = (): JSX.Element => (
  <MetaProvider>
    <AuthProvider>
      <FilterProvider>
        <App />
      </FilterProvider>
    </AuthProvider>
  </MetaProvider>
)

export default Root
