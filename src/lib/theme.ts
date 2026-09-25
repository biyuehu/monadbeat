import { createSignal } from 'solid-js'

export type Theme = 'dark' | 'light'

const THEME_KEY = 'monadbeat.theme'

const readStoredTheme = (): Theme => {
  const raw = localStorage.getItem(THEME_KEY)
  return raw === 'light' ? 'light' : 'dark'
}

export const [theme, setThemeSignal] = createSignal<Theme>(readStoredTheme())

export const applyTheme = (next: Theme): void => {
  setThemeSignal(next)
  localStorage.setItem(THEME_KEY, next)
  if (next === 'light') document.body.classList.add('theme-light')
  else document.body.classList.remove('theme-light')
}

export const toggleTheme = (): void => {
  applyTheme(theme() === 'light' ? 'dark' : 'light')
}

applyTheme(theme())
