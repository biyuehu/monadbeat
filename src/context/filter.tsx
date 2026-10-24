import { createContext, type JSX, useContext } from 'solid-js'
import { createStore } from 'solid-js/store'
import { type ProblemType, ProblemTypeOrder } from '../types'

export type StatusFilterKey = 'todo' | 'correct' | 'wrong'

export const StatusFilterOrder: readonly StatusFilterKey[] = ['todo', 'correct', 'wrong'] as const

export const StatusFilterLabel: Record<StatusFilterKey, { label: string; icon: string }> = {
  todo: { label: 'Unattempted (未做)', icon: '🔘' },
  correct: { label: 'Solved (已做对)', icon: '🟢/🔵' },
  wrong: { label: 'Attempted / Unsolved (未通过)', icon: '🔴' }
}

export const DifficultyList = [1, 2, 3, 4, 5] as const

type FilterStore = {
  types: Record<ProblemType, boolean>
  status: Record<StatusFilterKey, boolean>
  difficulties: Record<number, boolean>
}

type FilterContextValue = {
  state: FilterStore
  setType: (key: ProblemType, value: boolean) => void
  setStatus: (key: StatusFilterKey, value: boolean) => void
  setDifficulty: (level: number, value: boolean) => void
  reset: () => void
  isFiltering: () => boolean
}

const defaultStore = (): FilterStore => ({
  types: Object.fromEntries(ProblemTypeOrder.map((k) => [k, true])) as Record<ProblemType, boolean>,
  status: Object.fromEntries(StatusFilterOrder.map((k) => [k, true])) as Record<StatusFilterKey, boolean>,
  difficulties: Object.fromEntries(DifficultyList.map((d) => [d, true])) as Record<number, boolean>
})

const FilterContext = createContext<FilterContextValue>()

export const FilterProvider = (props: { children: JSX.Element }): JSX.Element => {
  const [state, setState] = createStore<FilterStore>(defaultStore())

  const value: FilterContextValue = {
    state,
    setType: (key, v) => setState('types', key, v),
    setStatus: (key, v) => setState('status', key, v),
    setDifficulty: (level, v) => setState('difficulties', level, v),
    reset: () => {
      for (const k of ProblemTypeOrder) setState('types', k, true)
      for (const k of StatusFilterOrder) setState('status', k, true)
      for (const d of DifficultyList) setState('difficulties', d, true)
    },
    isFiltering: () =>
      ProblemTypeOrder.some((k) => !state.types[k]) ||
      StatusFilterOrder.some((k) => !state.status[k]) ||
      DifficultyList.some((d) => !state.difficulties[d])
  }

  return <FilterContext.Provider value={value}>{props.children}</FilterContext.Provider>
}

export const useFilter = (): FilterContextValue => {
  const ctx = useContext(FilterContext)
  if (ctx === undefined) throw new Error('useFilter must be used within FilterProvider')
  return ctx
}
