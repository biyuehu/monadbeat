import { createSignal, For, type JSX, onCleanup, onMount, Show } from 'solid-js'

export const [shortcutsHelpOpen, setShortcutsHelpOpen] = createSignal(false)
export const [activeHelpTab, setActiveHelpTab] = createSignal<'shortcuts' | 'guide'>('shortcuts')

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
  const handleModalKeyDown = (e: KeyboardEvent): void => {
    if (!shortcutsHelpOpen()) return

    // Tab or 1 / 2 switches tab
    if (e.key === 'Tab') {
      e.preventDefault()
      setActiveHelpTab((prev) => (prev === 'shortcuts' ? 'guide' : 'shortcuts'))
      return
    }
    if (e.key === '1') {
      e.preventDefault()
      setActiveHelpTab('shortcuts')
      return
    }
    if (e.key === '2') {
      e.preventDefault()
      setActiveHelpTab('guide')
      return
    }
    if (e.key === 'h' || e.key === 'ArrowLeft' || e.key === '[') {
      e.preventDefault()
      setActiveHelpTab('shortcuts')
      return
    }
    if (e.key === 'l' || e.key === 'ArrowRight' || e.key === ']') {
      e.preventDefault()
      setActiveHelpTab('guide')
      return
    }
  }

  onMount(() => {
    window.addEventListener('keydown', handleModalKeyDown)
  })

  onCleanup(() => {
    window.removeEventListener('keydown', handleModalKeyDown)
  })

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
          <div class="flex items-center justify-between px-5 py-3 border-b border-sep bg-head shrink-0">
            {/* Tabs */}
            <div class="flex items-center gap-2">
              <button
                type="button"
                class={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold cursor-pointer transition-colors ${
                  activeHelpTab() === 'shortcuts'
                    ? 'bg-field text-accent border border-sep'
                    : 'text-dim hover:text-fg bg-transparent border border-transparent'
                }`}
                onClick={() => setActiveHelpTab('shortcuts')}
              >
                <span>⌨️</span>
                <span>Keyboard Shortcuts</span>
                <kbd class="ml-1 text-[0.65rem] opacity-60 font-mono">1</kbd>
              </button>
              <button
                type="button"
                class={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold cursor-pointer transition-colors ${
                  activeHelpTab() === 'guide'
                    ? 'bg-field text-accent border border-sep'
                    : 'text-dim hover:text-fg bg-transparent border border-transparent'
                }`}
                onClick={() => setActiveHelpTab('guide')}
              >
                <span>📖</span>
                <span>Rules &amp; Guide</span>
                <kbd class="ml-1 text-[0.65rem] opacity-60 font-mono">2</kbd>
              </button>
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
          <div class="flex-1 overflow-y-auto p-5 flex flex-col text-xs">
            <Show when={activeHelpTab() === 'shortcuts'}>
              <div class="flex flex-col gap-5">
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
            </Show>

            <Show when={activeHelpTab() === 'guide'}>
              <div class="flex flex-col gap-4 text-muted leading-relaxed">
                <div>
                  <h4 class="font-bold text-accent text-sm mb-1">⚡ What is MonadBeat?</h4>
                  <p>
                    Unlike generic algorithm platforms (LeetCode, Codewars) where Haskell is just &ldquo;another
                    language to write procedural array loops&rdquo;,
                    <strong>
                      {' '}
                      MonadBeat focuses exclusively on challenges that only make sense within Haskell and modern type
                      systems
                    </strong>
                    : type deduction, non-strict evaluation mechanics, and algebraic laws.
                  </p>
                  <p class="mt-1 text-dim">
                    Standard platforms rely on &ldquo;stdin &rarr; stdout string diffs&rdquo;. That model completely
                    fails to capture what makes Haskell special: expressive type-level puzzles, subtle laziness traps,
                    and clean algebraic invariants.
                  </p>
                </div>

                <div class="border-t border-sep/50 pt-3">
                  <h4 class="font-bold text-soft mb-1">1. Type Deduction (infer_type) &amp; Explicit forall</h4>
                  <p>
                    Given a function or pointfree expression, deduce its principal type signature. GHC verifies your
                    answer via <strong>bidirectional isomorphism check</strong> (both{' '}
                    <code class="text-accent bg-field px-1 py-0.5 rounded">UserSig -&gt; CorrectSig</code> and{' '}
                    <code class="text-accent bg-field px-1 py-0.5 rounded">CorrectSig -&gt; UserSig</code> must compile
                    with identity).
                  </p>
                  <p class="mt-1">
                    Because your submission is evaluated as a standalone type synonym without surrounding bindings,{' '}
                    <strong>free type variables must be explicitly quantified with forall</strong>:
                  </p>
                  <div class="mt-1.5 p-2 bg-field/60 border border-sep rounded font-mono text-[0.72rem] text-fg">
                    <span class="text-err">✗ (a -&gt; b) -&gt; [a] -&gt; [b]</span>{' '}
                    <span class="text-dim">&larr; GHC: Not in scope: type variable &lsquo;a&rsquo;</span>
                    <br />
                    <span class="text-ok">✓ forall a b. (a -&gt; b) -&gt; [a] -&gt; [b]</span>
                  </div>
                </div>

                <div class="border-t border-sep/50 pt-3">
                  <h4 class="font-bold text-soft mb-1">2. Function Search (find_function) &amp; Multiple Solutions</h4>
                  <p>
                    Given a target signature, provide any valid Haskell expression. Because GHC checks type-level
                    satisfaction directly, <strong>multiple distinct implementations are naturally accepted</strong>{' '}
                    (e.g. for <code class="text-soft">a -&gt; b -&gt; a</code>, both{' '}
                    <code class="text-accent">const</code> and <code class="text-accent">\x y -&gt; x</code> pass).
                  </p>
                  <p class="mt-1 text-dim">
                    Note: Submissions containing bottom values like <code class="text-accent">undefined</code> or{' '}
                    <code class="text-accent">error</code> are strictly rejected by the judge.
                  </p>
                </div>

                <div class="border-t border-sep/50 pt-3">
                  <h4 class="font-bold text-soft mb-1">3. Laziness Modeling (predict_behavior)</h4>
                  <p>
                    Analyze code snippets involving infinite structures, <code class="text-accent">seq</code>, Weak Head
                    Normal Form (WHNF), pattern-matching strictness, and short-circuit evaluation. Zero compiler
                    overhead &mdash; purely testing your mental model of Haskell&rsquo;s runtime evaluation.
                  </p>
                </div>

                <div class="border-t border-sep/50 pt-3">
                  <h4 class="font-bold text-soft mb-1">4. Legal Cheating: Hoogle is Your Best Friend</h4>
                  <p>
                    Can&rsquo;t remember a standard library function or curious what signature matches your pattern?{' '}
                    <strong>Searching Hoogle is encouraged and intended</strong>:
                  </p>
                  <p class="mt-1">
                    👉{' '}
                    <a
                      href="https://hoogle.haskell.org"
                      target="_blank"
                      rel="noreferrer"
                      class="text-brand hover:underline font-semibold"
                    >
                      hoogle.haskell.org ↗
                    </a>
                  </p>
                </div>
              </div>
            </Show>
          </div>

          {/* Footer */}
          <div class="px-5 py-2.5 border-t border-sep bg-head/50 text-[0.68rem] text-dim flex items-center justify-between shrink-0">
            <span>
              Press <kbd class="px-1 py-0.5 rounded font-mono bg-field border border-sep">?</kbd> anywhere to toggle
              this window
            </span>
            <span>MonadBeat Guide</span>
          </div>
        </div>
      </div>
    </Show>
  )
}
