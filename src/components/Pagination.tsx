import type { JSX } from 'solid-js'

export const Pagination = (props: {
  page: number
  pageSize: number
  total: number
  onPageChange: (newPage: number) => void
}): JSX.Element => {
  const totalPages = () => Math.max(1, Math.ceil(props.total / props.pageSize))
  const hasPrev = () => props.page > 1
  const hasNext = () => props.page < totalPages()

  const startIdx = () => (props.total === 0 ? 0 : (props.page - 1) * props.pageSize + 1)
  const endIdx = () => Math.min(props.page * props.pageSize, props.total)

  return (
    <div class="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-sep text-xs text-dim shrink-0">
      <div>
        Showing <span class="text-soft font-mono font-medium">{startIdx()}</span>–
        <span class="text-soft font-mono font-medium">{endIdx()}</span> of{' '}
        <span class="text-soft font-mono font-medium">{props.total}</span>
      </div>

      <div class="flex items-center gap-1.5 font-mono">
        <button
          type="button"
          class="btn-xs btn-muted disabled:opacity-30 disabled:cursor-not-allowed"
          disabled={!hasPrev()}
          onClick={() => props.onPageChange(props.page - 1)}
        >
          &lt; Prev
        </button>

        <span class="px-2 py-0.5 text-xs text-soft">
          {props.page} / {totalPages()}
        </span>

        <button
          type="button"
          class="btn-xs btn-muted disabled:opacity-30 disabled:cursor-not-allowed"
          disabled={!hasNext()}
          onClick={() => props.onPageChange(props.page + 1)}
        >
          Next &gt;
        </button>
      </div>
    </div>
  )
}
