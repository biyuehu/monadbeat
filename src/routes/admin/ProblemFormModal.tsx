import { Effect } from 'effect'
import { createEffect, createResource, createSignal, type JSX, Show } from 'solid-js'
import {
  adminCreateProblem,
  adminGetProblem,
  adminUpdateProblem,
  type ProblemAdminDetail,
  type ProblemCreate
} from '../../lib/adminApi'

// ── Tiny form helper ──────────────────────────────────────────────────────
const Field = (props: { label: string; children: JSX.Element; required?: boolean }): JSX.Element => (
  <div class="flex flex-col gap-1">
    <span class="text-xs text-dim">
      {props.label}
      {props.required && <span class="text-red-400 ml-0.5">*</span>}
    </span>
    {props.children}
  </div>
)

type Props = {
  token: string
  slug?: string // undefined → create mode
  onClose: () => void
  onSaved: () => void
}

const PROBLEM_TYPES = ['infer_type', 'find_function', 'predict_behavior'] as const
type ProblemType = (typeof PROBLEM_TYPES)[number]

type FormState = {
  slug: string
  title: string
  difficulty: number
  category: string // comma-separated
  remark: string
  is_published: boolean
  problem_type: ProblemType
  // type-specific fields
  scaffold: string // infer_type / find_function
  display_snippet: string
  display_code: string // predict_behavior
  options: string // newline-separated
  correct_index: number
}

const emptyForm = (): FormState => ({
  slug: '',
  title: '',
  difficulty: 3,
  category: '',
  remark: '',
  is_published: false,
  problem_type: 'infer_type',
  scaffold: '',
  display_snippet: '',
  display_code: '',
  options: '',
  correct_index: 0
})

const detailToForm = (d: ProblemAdminDetail): FormState => {
  const jc = d.judge_config as {
    problem_type: ProblemType
    scaffold?: string
    display_snippet?: string
    display_code?: string
    options?: string[]
    correct_index?: number
  }
  return {
    slug: d.slug,
    title: d.title,
    difficulty: d.difficulty,
    category: (d.category ?? []).join(', '),
    remark: d.remark ?? '',
    is_published: d.is_published,
    problem_type: jc.problem_type,
    scaffold: jc.scaffold ?? '',
    display_snippet: jc.display_snippet ?? '',
    display_code: jc.display_code ?? '',
    options: (jc.options ?? []).join('\n'),
    correct_index: jc.correct_index ?? 0
  }
}

const buildJudgeConfig = (f: FormState): ProblemCreate['judge_config'] => {
  if (f.problem_type === 'infer_type')
    return { problem_type: 'infer_type', scaffold: f.scaffold, display_snippet: f.display_snippet }
  if (f.problem_type === 'find_function')
    return { problem_type: 'find_function', scaffold: f.scaffold, display_snippet: f.display_snippet }
  return {
    problem_type: 'predict_behavior',
    display_code: f.display_code,
    options: f.options
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean),
    correct_index: Number(f.correct_index)
  }
}

export const ProblemFormModal = (props: Props): JSX.Element => {
  const isEdit = (): boolean => props.slug !== undefined

  const [detail] = createResource(
    () => props.slug,
    (slug) => Effect.runPromise(adminGetProblem(slug, props.token))
  )

  const [form, setForm] = createSignal<FormState>(emptyForm())
  const [saving, setSaving] = createSignal(false)
  const [err, setErr] = createSignal<string | null>(null)

  createEffect(() => {
    const d = detail()
    if (d) {
      setForm(detailToForm(d))
    }
  })

  const f = (): FormState => form()

  const set = <K extends keyof FormState>(key: K, val: FormState[K]): void => {
    setForm((prev) => ({ ...prev, [key]: val }))
  }

  const save = async (): Promise<void> => {
    setSaving(true)
    setErr(null)
    try {
      const cur = f()
      const jc = buildJudgeConfig(cur)
      const cats = cur.category
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
      if (isEdit() && props.slug) {
        await Effect.runPromise(
          adminUpdateProblem(
            props.slug,
            {
              title: cur.title,
              difficulty: cur.difficulty,
              category: cats,
              remark: cur.remark || undefined,
              is_published: cur.is_published,
              judge_config: jc
            },
            props.token
          )
        )
      } else {
        await Effect.runPromise(
          adminCreateProblem(
            {
              slug: cur.slug,
              title: cur.title,
              difficulty: cur.difficulty,
              category: cats,
              remark: cur.remark || undefined,
              is_published: cur.is_published,
              judge_config: jc
            } as ProblemCreate,
            props.token
          )
        )
      }
      props.onSaved()
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
    } finally {
      setSaving(false)
    }
  }

  const textarea = (val: string, onChange: (v: string) => void, placeholder?: string, rows = 4): JSX.Element => (
    <textarea
      class="input-field font-mono text-xs resize-y"
      style={{ height: `${rows * 1.6}rem` }}
      value={val}
      onInput={(e) => onChange(e.currentTarget.value)}
      placeholder={placeholder}
    />
  )

  return (
    <div class="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-black/75 backdrop-blur-xs">
      <div class="terminal max-h-[90vh] flex flex-col w-full max-w-2xl border border-line shadow-2xl overflow-hidden rounded-md">
        {/* Modal Header */}
        <div class="flex items-center justify-between px-5 py-3.5 border-b border-sep bg-panel shrink-0">
          <span class="font-bold text-soft">{isEdit() ? `Edit: ${props.slug}` : 'New Problem'}</span>
          <button type="button" class="text-dim hover:text-soft text-lg leading-none p-1" onClick={props.onClose}>
            ✕
          </button>
        </div>

        {/* Modal Body (Scrollable) */}
        <div class="flex-1 overflow-y-auto p-5 flex flex-col gap-4">
          <Show when={err()}>
            <div class="text-xs text-red-400 bg-red-900/20 border border-red-800 rounded px-3 py-2">{err()}</div>
          </Show>

          <div class="flex flex-col gap-3.5">
            <Show when={!isEdit()}>
              <Field label="Slug" required>
                <input
                  class="input-field font-mono text-xs"
                  value={f().slug}
                  placeholder="my-problem-slug"
                  onInput={(e) => set('slug', e.currentTarget.value)}
                />
              </Field>
            </Show>

            <Field label="Title" required>
              <input class="input-field" value={f().title} onInput={(e) => set('title', e.currentTarget.value)} />
            </Field>

            <div class="grid grid-cols-2 gap-3">
              <Field label="Difficulty (1–5)" required>
                <input
                  class="input-field"
                  type="number"
                  min={1}
                  max={5}
                  value={f().difficulty}
                  onInput={(e) => set('difficulty', Number(e.currentTarget.value))}
                />
              </Field>
              <Field label="Problem Type" required>
                <select
                  class="input-field"
                  value={f().problem_type}
                  onChange={(e) => set('problem_type', e.currentTarget.value as ProblemType)}
                >
                  {PROBLEM_TYPES.map((t) => (
                    <option value={t}>{t}</option>
                  ))}
                </select>
              </Field>
            </div>

            <Field label="Category (comma-separated)">
              <input
                class="input-field"
                value={f().category}
                placeholder="haskell, types"
                onInput={(e) => set('category', e.currentTarget.value)}
              />
            </Field>

            <Field label="Remark">{textarea(f().remark, (v) => set('remark', v), 'Optional hint or note…', 2)}</Field>

            {/* Type-specific fields */}
            <Show when={f().problem_type === 'infer_type' || f().problem_type === 'find_function'}>
              <Field label="Scaffold (Haskell, fed to GHC)" required>
                {textarea(f().scaffold, (v) => set('scaffold', v), '-- Haskell code…', 5)}
              </Field>
              <Field label="Display Snippet (shown to user)" required>
                {textarea(f().display_snippet, (v) => set('display_snippet', v), '-- Displayed code…', 5)}
              </Field>
            </Show>

            <Show when={f().problem_type === 'predict_behavior'}>
              <Field label="Display Code (shown to user)" required>
                {textarea(f().display_code, (v) => set('display_code', v), '-- Code to evaluate…', 5)}
              </Field>
              <Field label="Options (one per line)" required>
                {textarea(f().options, (v) => set('options', v), 'Option A\nOption B\n…', 3)}
              </Field>
              <Field label="Correct Option Index (0-based)" required>
                <input
                  class="input-field w-24"
                  type="number"
                  min={0}
                  value={f().correct_index}
                  onInput={(e) => set('correct_index', Number(e.currentTarget.value))}
                />
              </Field>
            </Show>

            <label class="flex items-center gap-2 text-xs text-soft cursor-pointer select-none mt-1">
              <input
                type="checkbox"
                class="accent-accent"
                checked={f().is_published}
                onChange={(e) => set('is_published', e.currentTarget.checked)}
              />
              Published (visible to users)
            </label>
          </div>
        </div>

        {/* Modal Footer */}
        <div class="flex gap-2 justify-end px-5 py-3 border-t border-sep bg-panel shrink-0">
          <button type="button" class="btn-sm btn-muted" onClick={props.onClose}>
            Cancel
          </button>
          <button type="button" class="btn-sm btn-accent" disabled={saving()} onClick={() => void save()}>
            {saving() ? 'Saving…' : isEdit() ? 'Save Changes' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  )
}
