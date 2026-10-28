/* @refresh reload */
import 'virtual:uno.css'
import './index.css'
import { MetaProvider } from '@solidjs/meta'
import { render } from 'solid-js/web'
import { App } from './App'
import { AuthProvider } from './context/auth'
import { DialogProvider } from './context/dialog'
import { FilterProvider } from './context/filter'

const root = document.getElementById('root')
const fallback = document.getElementById('app-fallback')
if (fallback) {
  fallback.remove()
}

render(
  () => (
    <MetaProvider>
      <AuthProvider>
        <DialogProvider>
          <FilterProvider>
            <App />
          </FilterProvider>
        </DialogProvider>
      </AuthProvider>
    </MetaProvider>
  ),
  root!
)
