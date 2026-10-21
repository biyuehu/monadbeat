import { type JSX, Show } from 'solid-js'
import { useFilter } from '../context/filter'
import { ProblemTypeLabel, ProblemTypeOrder } from '../types'

export const FilterPanel = (props: { open: boolean; onClose: () => void }): JSX.Element => {
  const { state, set, reset } = useFilter()

  return (
    <Show when={props.open}>
      <div class="fixed inset-0 z-[99999] flex items-center justify-center p-6 bg-black/75">
        <button
          type="button"
          class="absolute inset-0 size-full p-0 m-0 border-0 bg-transparent cursor-default"
          aria-label="Close filter"
          onClick={() => props.onClose()}
        />
        <div
          class="relative flex flex-col w-full max-w-105 max-h-[82vh] bg-panel border border-line text-fg shadow-[0_0_44px_var(--glow)]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="filterPanelTitle"
        >
          <div class="flex items-center justify-between px-4 py-3.5 border-b border-sep">
            <span class="text-sm font-bold tracking-wide text-accent" id="filterPanelTitle">
              Filter Problems
            </span>
            <button
              type="button"
              class="px-2 py-1 text-[0.95rem] bg-transparent border-0 cursor-pointer text-muted transition-colors hover:text-accent"
              aria-label="Close"
              onClick={() => props.onClose()}
            >
              ✕
            </button>
          </div>
          <div class="flex-1 min-h-0 overflow-y-auto px-4 py-4">
            <div class="section-label mb-3">Problem Type</div>
            <div class="flex flex-col gap-1">
              {ProblemTypeOrder.map((key) => (
                <label class="flex items-center gap-2.5 px-2.5 py-2 border border-sep bg-row cursor-pointer select-none transition-colors hover:bg-brand-tint hover:border-hov">
                  <input
                    type="checkbox"
                    class="m-0 size-[15px] shrink-0 cursor-pointer accent-brand"
                    checked={state[key]}
                    onChange={(e) => set(key, e.currentTarget.checked)}
                  />
                  <span class="flex-1 text-[0.8rem] text-text2">{ProblemTypeLabel[key]}</span>
                  <span class="text-[0.58rem] whitespace-nowrap text-dim">{key}</span>
                </label>
              ))}
            </div>
          </div>
          <div class="flex justify-end gap-2 px-4 py-3.5 border-t border-sep">
            <button type="button" class="btn-ghost px-[18px] py-[7px] text-[0.7rem]" onClick={() => reset()}>
              Reset
            </button>
            <button type="button" class="btn px-[18px] py-[7px] text-[0.7rem]" onClick={() => props.onClose()}>
              Apply
            </button>
          </div>
        </div>
      </div>
    </Show>
  )
}
