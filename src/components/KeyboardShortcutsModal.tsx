import { createSignal, For, type JSX, Show } from 'solid-js'

export const [shortcutsHelpOpen, setShortcutsHelpOpen] = createSignal(false)

interface ShortcutGroup {
  title: string
  items: { keys: string[]; desc: string }[]
}

const groups: ShortcutGroup[] = [
  {
    title: 'Global Navigation',
    items: [
      { keys: ['g', 'p'], desc: 'Go to Problems list' },
      { keys: ['g', 'l'], desc: 'Go to Leaderboard' },
      { keys: ['g', 's'], desc: 'Go to Submissions' },
      { keys: ['g', 'u'], desc: 'Go to Profile' },
      { keys: ['/'], desc: 'Focus search (Problems list)' },
      { keys: ['?'], desc: 'Toggle keyboard shortcuts help' },
      { keys: ['Esc'], desc: 'Close modals / blur input' }
    ]
  },
  {
    title: 'Problems List ( / )',
    items: [
      { keys: ['j', '↓'], desc: 'Select next problem' },
      { keys: ['k', '↑'], desc: 'Select previous problem' },
      { keys: ['Enter', 'o'], desc: 'Open selected problem' },
      { keys: ['[', ']'], desc: 'Previous / Next page' },
      { keys: ['t'], desc: 'Cycle problem type filter' },
      { keys: ['1', '…', '5'], desc: 'Toggle difficulty filter' }
    ]
  },
  {
    title: 'Quiz / Solving ( /quiz/:id )',
    items: [
      { keys: ['i'], desc: 'Focus code input (infer / find)' },
      { keys: ['A', '…', 'G'], desc: 'Select choice option (predict)' },
      { keys: ['Ctrl', 'Enter'], desc: 'Submit answer' },
      { keys: ['Alt', 'R'], desc: 'Reset input' },
      { keys: ['[', ']'], desc: 'Previous / Next problem' }
    ]
  },
  {
    title: 'Submissions History ( /submissions )',
    items: [
      { keys: ['j', '↓'], desc: 'Select next submission' },
      { keys: ['k', '↑'], desc: 'Select previous submission' },
      { keys: ['Enter', 'Space'], desc: 'Expand / collapse details' },
      { keys: ['v'], desc: 'Go to problem page' },
      { keys: ['f'], desc: 'Cycle filter (All / Correct / Wrong)' },
      { keys: ['[', ']'], desc: 'Previous / Next page' }
    ]
  },
  {
    title: 'Leaderboard ( /leaderboard )',
    items: [
      { keys: ['w'], desc: 'Week view' },
      { keys: ['m'], desc: 'Month view' },
      { keys: ['a'], desc: 'All-time view' },
      { keys: ['[', ']'], desc: 'Previous / Next page' }
    ]
  }
]

export const KeyboardShortcutsModal = (): JSX.Element => {
  return (
    <Show when={shortcutsHelpOpen()}>
      <div class="fixed inset-0 z-100 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-fade-in">
        <button
          type="button"
          class="fixed inset-0 size-full cursor-default border-0 bg-transparent"
          aria-label="Close shortcuts modal"
          onClick={() => setShortcutsHelpOpen(false)}
        />
        <div class="terminal relative z-10 border border-sep bg-panel shadow-2xl w-full max-w-xl max-h-[85vh] flex flex-col overflow-hidden text-fg font-sans">
          {/* Header */}
          <div class="flex items-center justify-between px-5 py-3.5 border-b border-sep bg-head shrink-0">
            <div class="flex items-center gap-2">
              <span class="text-brand font-bold text-lg">⌨️</span>
              <span class="font-bold text-sm tracking-tight text-soft">Keyboard Shortcuts</span>
            </div>
            <button
              type="button"
              class="text-dim hover:text-fg text-xs px-2 py-1 rounded border border-sep bg-field cursor-pointer"
              onClick={() => setShortcutsHelpOpen(false)}
            >
              Esc
            </button>
          </div>

          {/* Body */}
          <div class="flex-1 overflow-y-auto p-5 flex flex-col gap-5 text-xs">
            <For each={groups}>
              {(group) => (
                <div class="flex flex-col gap-2">
                  <div class="text-[0.68rem] uppercase tracking-widest font-semibold text-accent/90 border-b border-sep/60 pb-1">
                    {group.title}
                  </div>
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    <For each={group.items}>
                      {(item) => (
                        <div class="flex items-center justify-between gap-2 p-1.5 rounded bg-row/40 hover:bg-row">
                          <span class="text-text2">{item.desc}</span>
                          <div class="flex items-center gap-1 shrink-0">
                            <For each={item.keys}>
                              {(k) => (
                                <kbd class="px-1.5 py-0.5 rounded font-mono font-medium text-[0.65rem] bg-field border border-sep text-fg shadow-xs">
                                  {k}
                                </kbd>
                              )}
                            </For>
                          </div>
                        </div>
                      )}
                    </For>
                  </div>
                </div>
              )}
            </For>
          </div>

          {/* Footer */}
          <div class="px-5 py-2.5 border-t border-sep bg-head/50 text-[0.68rem] text-dim flex items-center justify-between shrink-0">
            <span>
              Press <kbd class="px-1 py-0.5 rounded font-mono bg-field border border-sep">?</kbd> anywhere to toggle
              this cheat sheet
            </span>
            <span>MonadBeat Keymap</span>
          </div>
        </div>
      </div>
    </Show>
  )
}
