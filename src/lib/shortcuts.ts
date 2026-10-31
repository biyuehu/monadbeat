import { useNavigate } from '@solidjs/router'
import { onCleanup, onMount } from 'solid-js'
import { setShortcutsHelpOpen, shortcutsHelpOpen } from '../components/KeyboardShortcutsModal'

export const isInputElement = (el: EventTarget | null): boolean => {
  if (!el || !(el instanceof HTMLElement)) return false
  const tag = el.tagName.toLowerCase()
  return tag === 'input' || tag === 'textarea' || el.isContentEditable
}

export const useGlobalShortcuts = (): void => {
  const navigate = useNavigate()
  let leaderKeyTimeout: ReturnType<typeof setTimeout> | null = null
  let pendingLeader: string | null = null

  const handleKeyDown = (e: KeyboardEvent): void => {
    // 1. Esc key always dismisses modal or active input focus
    if (e.key === 'Escape') {
      if (shortcutsHelpOpen()) {
        e.preventDefault()
        setShortcutsHelpOpen(false)
        return
      }
      if (isInputElement(e.target)) {
        ;(e.target as HTMLElement).blur()
        return
      }
    }

    // 2. Ignore single-key shortcuts when typing in inputs/textareas
    if (isInputElement(e.target)) {
      return
    }

    // 3. Question mark ? toggles cheat sheet
    if (e.key === '?') {
      e.preventDefault()
      setShortcutsHelpOpen(!shortcutsHelpOpen())
      return
    }

    // 4. Two-key Vim navigation sequences (e.g. g + p, g + l, g + s, g + u)
    if (pendingLeader === 'g') {
      pendingLeader = null
      if (leaderKeyTimeout) {
        clearTimeout(leaderKeyTimeout)
        leaderKeyTimeout = null
      }

      if (e.key === 'p') {
        e.preventDefault()
        navigate('/')
        return
      }
      if (e.key === 'l') {
        e.preventDefault()
        navigate('/leaderboard')
        return
      }
      if (e.key === 's') {
        e.preventDefault()
        navigate('/submissions')
        return
      }
      if (e.key === 'u' || e.key === 'm') {
        e.preventDefault()
        navigate('/profile')
        return
      }
    }

    if (e.key === 'g' && !e.ctrlKey && !e.metaKey && !e.altKey) {
      pendingLeader = 'g'
      leaderKeyTimeout = setTimeout(() => {
        pendingLeader = null
      }, 1000)
      return
    }
  }

  onMount(() => {
    window.addEventListener('keydown', handleKeyDown)
  })

  onCleanup(() => {
    window.removeEventListener('keydown', handleKeyDown)
    if (leaderKeyTimeout) clearTimeout(leaderKeyTimeout)
  })
}
