import { createSignal, type JSX, Show } from 'solid-js'
import { setShortcutsHelpOpen } from './KeyboardShortcutsModal'

const STORAGE_KEY = 'monadbeat_welcome_banner_dismissed_v1'

export const [bannerDismissed, setBannerDismissed] = createSignal<boolean>(
  typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) === 'true' : false
)

export const dismissBanner = (): void => {
  setBannerDismissed(true)
  try {
    localStorage.setItem(STORAGE_KEY, 'true')
  } catch {
    // Ignore storage quota or access errors
  }
}

export const restoreBanner = (): void => {
  setBannerDismissed(false)
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Ignore
  }
}

export const WelcomeBanner = (): JSX.Element => {
  return (
    <Show when={!bannerDismissed()}>
      <div class="relative w-full max-w-200 mx-auto mb-4 p-3.5 md:p-4 bg-brand-bg/40 border border-accent/40 rounded shadow-sm text-xs leading-relaxed text-fg shrink-0 animate-fade-in">
        {/* Close Button */}
        <button
          type="button"
          class="absolute top-2.5 right-2.5 text-dim hover:text-fg text-xs px-1.5 py-0.5 rounded border border-sep/60 bg-panel hover:bg-hl transition-colors cursor-pointer"
          title="Dismiss guide (can reopen anytime by pressing ?)"
          onClick={dismissBanner}
        >
          ✕ Dismiss
        </button>

        <div class="flex items-center gap-2 mb-2 font-semibold text-accent text-[0.82rem]">
          <span>⚡</span>
          <span>Welcome to MonadBeat — Pure Functional &amp; Type Gym</span>
        </div>

        <p class="text-text2 mb-2 pr-16 md:pr-12">
          Unlike generic LeetCode/Codewars platforms that only treat Haskell as &ldquo;another language for procedural
          algorithms&rdquo;, MonadBeat focuses strictly on challenges uniquely meaningful within Haskell&rsquo;s own
          domain: <strong>type system puzzles, laziness mechanics, and algebraic laws</strong> without runtime sandbox
          risks.
        </p>

        <ul class="flex flex-col gap-1.5 text-muted pl-4 list-disc marker:text-accent/70 pr-16 md:pr-12">
          <li>
            <strong class="text-soft">infer_type (Type Deduction):</strong> Deduced via bidirectional GHC isomorphism
            checks (<code class="text-accent bg-field px-1 py-0.5 rounded">check1</code> &amp;{' '}
            <code class="text-accent bg-field px-1 py-0.5 rounded">check2</code>). In standalone signatures, universal
            variables must have an explicit <code class="text-accent bg-field px-1 py-0.5 rounded">forall</code> (e.g.{' '}
            <code class="text-soft bg-field px-1 py-0.5 rounded">forall a. [a] -&gt; Int</code>).
          </li>
          <li>
            <strong class="text-soft">find_function (Reverse Search):</strong> Write any valid Haskell expression
            matching the target signature. Multiple correct solutions are naturally accepted. (Trivial bottoms like{' '}
            <code>undefined</code> / <code>error</code> are rejected).
          </li>
          <li>
            <strong class="text-soft">predict_behavior (Laziness Modeling):</strong> Multiple-choice questions
            dissecting Haskell&rsquo;s lazy evaluation, WHNF, pattern-match timing, and short-circuits.
          </li>
          <li>
            <strong class="text-soft">Canonical Companion:</strong> Unsure about standard functions or signatures? Using{' '}
            <a
              href="https://hoogle.haskell.org"
              target="_blank"
              rel="noreferrer"
              class="text-brand hover:underline font-semibold inline-flex items-center gap-0.5"
            >
              Hoogle ↗
            </a>{' '}
            is actively encouraged!
          </li>
          <li>
            <strong class="text-soft">All-Keyboard Control:</strong> Press{' '}
            <button
              type="button"
              class="inline-block px-1 py-0.2 bg-panel border border-sep rounded text-accent font-mono cursor-pointer hover:bg-hl"
              onClick={() => setShortcutsHelpOpen(true)}
            >
              ?
            </button>{' '}
            at any time to view the comprehensive guide &amp; keymap.
          </li>
        </ul>
      </div>
    </Show>
  )
}
