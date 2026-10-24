import { createSignal } from 'solid-js'

const INFER_NAME_KEY = 'monadbeat.infer_name'
const FIND_NAME_KEY = 'monadbeat.find_name'

const readStored = (key: string, fallback: string): string => {
  const val = localStorage.getItem(key)?.trim()
  return val ? val : fallback
}

export const [inferName, setInferNameSignal] = createSignal<string>(readStored(INFER_NAME_KEY, 'f'))
export const [findName, setFindNameSignal] = createSignal<string>(readStored(FIND_NAME_KEY, 'target'))

export const setInferName = (name: string): void => {
  const sanitized = name.trim() || 'f'
  setInferNameSignal(sanitized)
  localStorage.setItem(INFER_NAME_KEY, sanitized)
}

export const setFindName = (name: string): void => {
  const sanitized = name.trim() || 'target'
  setFindNameSignal(sanitized)
  localStorage.setItem(FIND_NAME_KEY, sanitized)
}
