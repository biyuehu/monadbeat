import { createContext, type JSX, useContext } from 'solid-js'
import { createStore } from 'solid-js/store'
import { type ProblemType, ProblemTypeOrder } from '../lib/schema'

type FilterStore = Record<ProblemType, boolean>

type FilterContextValue = {
  state: FilterStore
  set: (key: ProblemType, value: boolean) => void
  reset: () => void
  isFiltering: () => boolean
  activeTypes: () => FilterStore
}

const allTrue = (): FilterStore => Object.fromEntries(ProblemTypeOrder.map((k) => [k, true])) as FilterStore

const FilterContext = createContext<FilterContextValue>()

export const FilterProvider = (props: { children: JSX.Element }): JSX.Element => {
  const [state, setState] = createStore<FilterStore>(allTrue())

  const value: FilterContextValue = {
    state,
    set: (key, v) => setState(key, v),
    reset: () => ProblemTypeOrder.map((k) => setState(k, true)),
    isFiltering: () => ProblemTypeOrder.some((k) => !state[k]),
    activeTypes: () => ({ ...state })
  }

  return <FilterContext.Provider value={value}>{props.children}</FilterContext.Provider>
}

export const useFilter = (): FilterContextValue => {
  const ctx = useContext(FilterContext)
  if (ctx === undefined) throw new Error('useFilter must be used within FilterProvider')
  return ctx
}
