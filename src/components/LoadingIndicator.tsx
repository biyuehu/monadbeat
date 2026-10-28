import type { JSX } from 'solid-js'

export const LoadingIndicator = (props: { text?: string; class?: string }): JSX.Element => (
  <div class={`flex flex-col items-center justify-center gap-3 p-8 my-auto text-center ${props.class ?? ''}`}>
    <div class="relative flex size-12 items-center justify-center">
      <div class="absolute inset-0 rounded-full border-2 border-brand/30 animate-ping opacity-60" />
      <div class="flex size-10 items-center justify-center rounded-full border border-line bg-panel2 text-xl font-bold font-mono text-accent shadow-[0_0_18px_var(--glow)] animate-pulse">
        λ
      </div>
    </div>
    <span class="text-xs font-mono text-dim tracking-wider uppercase">{props.text ?? 'Loading...'}</span>
  </div>
)
