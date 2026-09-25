/* @refresh reload */
import { render } from 'solid-js/web'
import './styles/base.css'
import './styles/headbar.css'
import './styles/filter.css'
import './styles/account.css'
import './styles/leaderboard.css'
import './styles/main.css'
import './styles/quiz.css'
import './styles/profile.css'
import './index.css'
import Root from './App'

const root = document.getElementById('root')

render(() => <Root />, root!)
