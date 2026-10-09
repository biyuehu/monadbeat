import { useNavigate, useParams } from '@solidjs/router'
import { Effect, flow } from 'effect'
import { createSignal, For, type JSX, Show } from 'solid-js'
import { FooterLine, Frame } from '../components/Frame'
import { useAuth } from '../context/auth'
import { fetchProblemDetail, fetchProblems, submitAnswer } from '../lib/api'
import type { ChoiceDisplay, Display, ProblemDetail, ProblemListItem, TextDisplay } from '../lib/types'

type Feedback = { kind: 'ok' | 'error' | 'info'; text: string }

const errorFeedback = (text: string): Feedback => ({ kind: 'error', text })

const escapeHtml = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

const highlight = (code: string): string => {
  const tokens: string[] = []
  const stash = (html: string): string => {
    tokens.push(html)
    return `\uE000${tokens.length - 1}\uE000`
  }
  const stashed = escapeHtml(code)
    .replace(/(--.*)/g, (_, m: string) => stash(`<span class="text-dim italic">${m}</span>`))
    .replace(/::/g, () => stash('<span class="text-accent">::</span>'))
    .replace(/\b(import|qualified|as|instance|data|deriving|where|class|type)\b/g, (_, m: string) =>
      stash(`<span class="text-brand font-semibold">${m}</span>`)
    )
    .replace(/\b([a-z][A-Za-z0-9_']*)\b(?=\s*[=(])/g, (_, m: string) => stash(`<span class="text-soft">${m}</span>`))
  return stashed.replace(/\uE000(\d+)\uE000/g, (_, i: string) => tokens[Number(i)] ?? '')
}

const headerOf = (problem: ProblemDetail): string => {
  switch (problem.problem_type) {
    case 'infer_type':
      return '✏️ Type Signature'
    case 'find_function':
      return '🔍 Function Implementation'
    case 'predict_behavior':
      return '🎯 Behavior Prediction'
    default:
      return '✏️ Problem'
  }
}

const labelOf = (problem: ProblemDetail): string => {
  switch (problem.problem_type) {
    case 'infer_type':
      return '📌 Write the type signature of the function below:'
    case 'find_function':
      return '📌 Implement a function that matches the following type signature:'
    case 'predict_behavior':
      return 'What happens when the following code runs?'
    default:
      return '📌 Problem:'
  }
}

const prefixOf = (problem: ProblemDetail): string => {
  switch (problem.problem_type) {
    case 'infer_type':
      return 'f ::'
    case 'find_function':
      return 'target = '
    default:
      return ''
  }
}

const feedbackClass: Record<Feedback['kind'], string> = {
  ok: 'text-ok border-ok bg-ok-bg',
  error: 'text-err border-err bg-err-bg',
  info: 'text-soft border-brand bg-brand-bg'
}

const isChoice = (display: Display): display is ChoiceDisplay => display.problem_type === 'predict_behavior'
const isText = (display: Display): display is TextDisplay =>
  display.problem_type === 'infer_type' || display.problem_type === 'find_function'

const labelCls = 'block mb-2 text-[0.72rem] uppercase tracking-wider text-muted'
const areaCls = 'w-full max-w-200 mx-auto mb-5 shrink-0'

export const QuizRoute = (): JSX.Element => {
  const navigate = useNavigate()
  const params = useParams<{ id: string }>()
  const { state: auth } = useAuth()
  const [problem, setProblem] = createSignal<ProblemDetail | null>(null)
  const [list, setList] = createSignal<readonly ProblemListItem[]>([])
  const [answer, setAnswer] = createSignal('')
  const [selected, setSelected] = createSignal(-1)
  const [feedback, setFeedback] = createSignal<Feedback | null>(null)
  const [submitting, setSubmitting] = createSignal(false)

  const load = (slug: string): void => {
    setProblem(null)
    setFeedback(null)
    setAnswer('')
    setSelected(-1)
    Effect.runPromise(fetchProblemDetail(slug))
      .then(setProblem)
      .catch(flow(String, errorFeedback, setFeedback))
  }

  Effect.runPromise(fetchProblems())
    .then(setList)
    .catch(() => setList([]))

  Effect.runPromise(Effect.sync(() => params.id))
    .then((slug) => (slug === undefined ? navigate('/') : load(slug)))
    .catch(() => navigate('/'))

  const goNext = (): void => {
    const slug = problem()?.slug
    if (slug === undefined) return
    const idx = list().findIndex((p) => p.slug === slug)
    const next = list()[idx + 1]
    if (next === undefined) navigate('/')
    else navigate(`/quiz/${next.slug}`)
  }

  const reset = (): void => {
    setAnswer('')
    setSelected(-1)
    setFeedback(null)
  }

  const submit = (): void => {
    const p = problem()
    const token = auth.token
    if (p === null || submitting()) return
    if (token === null) {
      setFeedback({ kind: 'error', text: '❌ Sign in required.' })
      return
    }
    if (p.problem_type === 'predict_behavior') {
      if (selected() === -1) {
        setFeedback({ kind: 'info', text: '⚠️ Please choose an option!' })
        return
      }
    } else if (answer().trim() === '') {
      setFeedback({ kind: 'info', text: '⚠️ Please enter your answer!' })
      return
    }

    const userAnswer = p.problem_type === 'predict_behavior' ? String(selected()) : answer()
    setSubmitting(true)
    Effect.runPromise(submitAnswer(p.slug, userAnswer, token))
      .then((res) => {
        if (res.is_correct) {
          setFeedback({ kind: 'ok', text: '✅ Correct! Moving on...' })
          setTimeout(goNext, 700)
        } else {
          setFeedback({ kind: 'error', text: `❌ ${res.judge_detail ?? 'Try again.'}` })
        }
      })
      .catch((err) => setFeedback({ kind: 'error', text: `❌ ${String(err)}` }))
      .finally(() => setSubmitting(false))
  }

  const codeOf = (p: ProblemDetail): string => {
    const d = p.display
    if (isText(d) || isChoice(d)) return d.code
    return ''
  }

  const progressText = (): string => {
    const p = problem()
    if (p === null) return ''
    const idx = list().findIndex((q) => q.slug === p.slug)
    const total = list().length
    return total > 0 && idx >= 0 ? `${idx + 1} / ${total}` : ''
  }

  return (
    <Show
      when={problem() !== null}
      fallback={
        <Frame title="Quiz">
          <div class="status-text text-dim">Loading...</div>
        </Frame>
      }
    >
      {(() => {
        const p = problem() as ProblemDetail
        return (
          <Frame title="Quiz">
            <div class="page-header items-baseline">
              <span class="page-title text-xl md:text-2xl">{headerOf(p)}</span>
              <span class="px-3 py-0.5 text-xs tracking-wide text-soft border border-edge bg-brand-bg">
                {progressText()}
              </span>
            </div>

            <div class={areaCls}>
              <span class={labelCls}>{labelOf(p)}</span>
              <div
                class="p-3.5 max-[420px]:p-3 text-[0.85rem] max-[420px]:text-[0.78rem] leading-7 text-fg whitespace-pre-wrap break-words overflow-x-auto bg-field border border-sep border-l-3 border-l-edge"
                innerHTML={highlight(codeOf(p))}
              />
            </div>

            <Show
              when={p.problem_type !== 'predict_behavior'}
              fallback={
                <div class={areaCls}>
                  <span class={labelCls}>Choose one option:</span>
                  <div class="flex flex-col gap-1">
                    <For each={isChoice(p.display) ? p.display.options : []}>
                      {(opt, i) => (
                        <button
                          type="button"
                          class={`list-row gap-2.5 px-3 py-2.5 text-left text-[0.82rem] max-[420px]:text-[0.78rem] font-[inherit] cursor-pointer border-y border-r ${
                            selected() === i()
                              ? 'bg-sel border-y-transparent border-r-transparent border-l-accent text-white'
                              : 'bg-row border-y-sep border-r-sep text-text2 hover:bg-brand-tint hover:border-y-hov hover:border-r-hov hover:text-strong'
                          }`}
                          onClick={() => setSelected(i())}
                        >
                          <span
                            class={`w-[1.4rem] shrink-0 text-center font-bold ${selected() === i() ? 'text-white' : 'text-soft'}`}
                          >
                            {String.fromCharCode(65 + i())}
                          </span>
                          <span class="min-w-0 break-words">{opt}</span>
                        </button>
                      )}
                    </For>
                  </div>
                </div>
              }
            >
              <div class={areaCls}>
                <span class={labelCls}>✏️ Input:</span>
                <div class="flex items-center px-3 max-md:px-2.5 bg-field border border-field-line transition-[border-color,box-shadow] focus-within:border-brand focus-within:shadow-[0_0_0_2px_var(--glow-soft)]">
                  <span class="shrink-0 py-2.5 pr-1.5 text-[0.85rem] whitespace-nowrap text-soft">{prefixOf(p)}</span>
                  <input
                    type="text"
                    class="flex-1 min-w-0 py-2.5 text-[0.85rem] font-[inherit] bg-transparent border-0 outline-none text-fg"
                    value={answer()}
                    onInput={(e) => {
                      setAnswer(e.currentTarget.value)
                      setFeedback(null)
                    }}
                  />
                </div>
              </div>
            </Show>

            <div class="flex w-full max-w-200 mx-auto mt-2 mb-4 justify-end gap-2 shrink-0">
              <button type="button" class="btn-ghost max-md:flex-1 px-[22px] py-2 text-[0.72rem]" onClick={reset}>
                ↻ Reset
              </button>
              <button
                type="button"
                class="btn max-md:flex-1 px-[22px] py-2 text-[0.72rem]"
                onClick={submit}
                disabled={submitting()}
              >
                ✓ Submit
              </button>
            </div>

            <Show when={feedback()}>
              {(fb) => (
                <div
                  class={`w-full max-w-200 mx-auto mb-3 px-3.5 py-2.5 text-[0.8rem] leading-relaxed whitespace-pre-wrap break-words border-l-3 shrink-0 ${feedbackClass[fb().kind]}`}
                >
                  {fb().text}
                </div>
              )}
            </Show>

            <FooterLine right="Haskell Practice" />
          </Frame>
        )
      })()}
    </Show>
  )
}
