import { defineConfig, presetWind4 } from 'unocss'

export default defineConfig({
  presets: [presetWind4()],
  theme: {
    colors: {
      fg: 'var(--fg)',
      panel: 'var(--panel)',
      panel2: 'var(--panel2)',
      line: 'var(--line)',
      sep: 'var(--sep)',
      edge: 'var(--edge)',
      accent: 'var(--accent)',
      soft: 'var(--soft)',
      muted: 'var(--muted)',
      dim: 'var(--dim)',
      faint: 'var(--faint)',
      text2: 'var(--text2)',
      strong: 'var(--strong)',
      head: 'var(--head)',
      sel: 'var(--sel)',
      row: 'var(--row)',
      hov: 'var(--hov)',
      countline: 'var(--count-line)',
      nav: { DEFAULT: 'var(--nav)', hover: 'var(--nav-hover)' },
      brand: { DEFAULT: '#7c5cbf', dark: '#47356e', tint: 'var(--brand-tint)', bg: 'var(--brand-bg)' },
      hl: {
        DEFAULT: 'var(--hl-bg)',
        line: 'var(--hl-line)',
        fg: 'var(--hl-fg)',
        sub: 'var(--hl-sub)',
        tag: 'var(--hl-tag)'
      },
      ok: { DEFAULT: 'var(--ok)', bg: 'var(--ok-bg)' },
      err: { DEFAULT: 'var(--err)', bg: 'var(--err-bg)', line: 'var(--err-line)' },
      warn: { DEFAULT: 'var(--warn)', bg: 'var(--warn-bg)' },
      field: { DEFAULT: 'var(--input)', line: 'var(--input-line)' },
      chip: { line: 'var(--tag-line)', fg: 'var(--tag-fg)' },
      ghost: { line: 'var(--ghost-line)', fg: 'var(--ghost-fg)' }
    }
  },
  shortcuts: {
    terminal:
      'flex flex-1 min-w-0 min-h-0 flex-col overflow-auto bg-panel border border-line shadow-[0_8px_30px_var(--shadow-soft)] transition-colors',
    'page-header': 'flex flex-wrap justify-between gap-3 mb-6 pb-2.5 border-b border-sep shrink-0',
    'page-title': 'font-bold tracking-tight text-accent shrink-0',
    'footer-line':
      'flex justify-between mt-auto pt-3 border-t border-sep text-[0.65rem] tracking-wide text-dim shrink-0',
    'status-text': 'p-8 text-center text-sm',
    btn: 'font-semibold tracking-wide text-white no-underline cursor-pointer bg-brand border border-brand transition-colors hover:bg-brand-dark hover:border-brand-dark active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed',
    'btn-ghost':
      'font-semibold tracking-wide cursor-pointer bg-transparent border border-ghost-line text-ghost-fg transition-colors hover:border-brand hover:text-accent active:scale-98',
    'list-box': 'flex flex-col gap-0.5 p-1 border border-edge',
    'list-row': 'flex items-center gap-3 border-l-3 border-l-transparent transition-colors',
    'section-label': 'text-[0.62rem] uppercase tracking-widest text-muted',
    chip: 'px-2.5 py-0.5 text-[0.6rem] tracking-wide whitespace-nowrap truncate max-w-full shrink-0 border border-chip-line text-chip-fg bg-row transition-colors',
    'empty-box': 'flex flex-col items-center justify-center gap-2.5 px-4 py-8 text-center',
    'empty-title': 'text-base font-bold tracking-wide text-accent',
    'empty-text': 'text-[0.78rem] tracking-wide text-muted'
  }
})
