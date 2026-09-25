import { type JSX, Show } from 'solid-js'
import { useFilter } from '../context/filter'
import { ProblemTypeLabel, ProblemTypeOrder } from '../lib/schema'

export const FilterPanel = (props: { open: boolean; onClose: () => void }): JSX.Element => {
  const { state, set, reset } = useFilter()

  return (
    <Show when={props.open}>
      <div class="filterOverlay">
        <button type="button" class="filterBackdrop" aria-label="Close filter" onClick={() => props.onClose()} />
        <div class="filterPanel" role="dialog" aria-modal="true" aria-labelledby="filterPanelTitle">
          <div class="filterPanelHeader">
            <span class="filterPanelTitle" id="filterPanelTitle">
              Filter Questions
            </span>
            <button type="button" class="filterClose" aria-label="Close" onClick={() => props.onClose()}>
              ✕
            </button>
          </div>
          <div class="filterBody">
            <div class="filterSectionLabel">Question Type</div>
            <div class="filterOptions">
              {ProblemTypeOrder.map((key) => (
                <label class="filterOption">
                  <input type="checkbox" checked={state[key]} onChange={(e) => set(key, e.currentTarget.checked)} />
                  <span class="filterOptionLabel">{ProblemTypeLabel[key]}</span>
                  <span class="filterOptionKey">{key}</span>
                </label>
              ))}
            </div>
          </div>
          <div class="filterFooter">
            <button type="button" class="filterAction ghost" onClick={() => reset()}>
              Reset
            </button>
            <button type="button" class="filterAction primary" onClick={() => props.onClose()}>
              Apply
            </button>
          </div>
        </div>
      </div>
    </Show>
  )
}
