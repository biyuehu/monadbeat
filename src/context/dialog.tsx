import { createContext, createSignal, For, type JSX, Show, useContext } from 'solid-js'

export type ToastType = 'info' | 'success' | 'warning' | 'error'

export type Toast = {
  id: number
  type: ToastType
  message: string
}

type ConfirmOptions = {
  title?: string
  message: string
  confirmText?: string
  cancelText?: string
  danger?: boolean
}

type DialogContextValue = {
  toast: (message: string, type?: ToastType, durationMs?: number) => void
  confirm: (options: ConfirmOptions | string) => Promise<boolean>
}

const DialogContext = createContext<DialogContextValue>()

export const DialogProvider = (props: { children: JSX.Element }): JSX.Element => {
  const [toasts, setToasts] = createSignal<Toast[]>([])
  const [confirmDialog, setConfirmDialog] = createSignal<{
    options: ConfirmOptions
    resolve: (val: boolean) => void
  } | null>(null)

  let nextId = 1

  const toast = (message: string, type: ToastType = 'info', durationMs = 3000): void => {
    const id = nextId++
    setToasts((prev) => [...prev, { id, type, message }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, durationMs)
  }

  const confirm = (options: ConfirmOptions | string): Promise<boolean> => {
    const opts: ConfirmOptions = typeof options === 'string' ? { message: options } : options
    return new Promise((resolve) => {
      setConfirmDialog({ options: opts, resolve })
    })
  }

  const handleConfirm = (choice: boolean): void => {
    const current = confirmDialog()
    if (current) {
      current.resolve(choice)
      setConfirmDialog(null)
    }
  }

  const toastStyle = (type: ToastType): string => {
    switch (type) {
      case 'success':
        return 'border-ok bg-ok-bg text-ok'
      case 'error':
        return 'border-err bg-err-bg text-err'
      case 'warning':
        return 'border-warn bg-warn-bg text-warn'
      default:
        return 'border-accent bg-brand-bg text-soft'
    }
  }

  return (
    <DialogContext.Provider value={{ toast, confirm }}>
      {props.children}

      {/* Toast Container */}
      <div class="fixed bottom-5 right-5 z-100 flex flex-col gap-2 max-w-sm pointer-events-none">
        <For each={toasts()}>
          {(t) => (
            <div
              class={`pointer-events-auto flex items-center gap-2.5 px-4 py-2.5 text-xs font-mono border shadow-lg backdrop-blur-md transition-all rounded ${toastStyle(
                t.type
              )}`}
            >
              <span class="text-sm">
                {t.type === 'success' ? '✓' : t.type === 'error' ? '✕' : t.type === 'warning' ? '⚠' : 'ℹ'}
              </span>
              <span class="flex-1 break-words">{t.message}</span>
            </div>
          )}
        </For>
      </div>

      {/* Confirmation Modal */}
      <Show when={confirmDialog()}>
        {(dialog) => (
          <div class="fixed inset-0 z-100 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
            <div class="terminal flex flex-col gap-4 w-full max-w-md p-5 border border-line shadow-2xl rounded-md bg-panel">
              <div class="font-bold text-soft text-sm">{dialog().options.title ?? 'Confirm Action'}</div>
              <div class="text-xs text-text2 leading-relaxed whitespace-pre-wrap">{dialog().options.message}</div>
              <div class="flex gap-2 justify-end pt-2">
                <button type="button" class="btn-sm btn-muted" onClick={() => handleConfirm(false)}>
                  {dialog().options.cancelText ?? 'Cancel'}
                </button>
                <button
                  type="button"
                  class={`btn-sm ${dialog().options.danger ? 'btn-danger' : 'btn-accent'}`}
                  onClick={() => handleConfirm(true)}
                >
                  {dialog().options.confirmText ?? 'Confirm'}
                </button>
              </div>
            </div>
          </div>
        )}
      </Show>
    </DialogContext.Provider>
  )
}

export const useDialog = (): DialogContextValue => {
  const ctx = useContext(DialogContext)
  if (ctx === undefined) {
    throw new Error('useDialog must be used within DialogProvider')
  }
  return ctx
}
