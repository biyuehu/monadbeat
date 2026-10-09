/* @refresh reload */
import 'virtual:uno.css'
import './index.css'
import { MetaProvider } from '@solidjs/meta'
import { render } from 'solid-js/web'
import { App } from './App'
import { AuthProvider } from './context/auth'
import { FilterProvider } from './context/filter'

const root = document.getElementById('root')

render(
  () => (
    <MetaProvider>
      <AuthProvider>
        <FilterProvider>
          <App />
        </FilterProvider>
      </AuthProvider>
    </MetaProvider>
  ),
  root!
)
