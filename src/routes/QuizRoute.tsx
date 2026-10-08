import { useNavigate, useParams } from '@solidjs/router'
import { Effect, flow } from 'effect'
import { createSignal, For, type JSX, Show } from 'solid-js'
import { RouteTitle } from '../components/RouteTitle'
import { useAuth } from '../context/auth'
import { fetchProblemDetail, fetchProblems, submitAnswer } from '../lib/api'
import type { ChoiceDisplay, Display, ProblemDetail, ProblemListItem, TextDisplay } from '../lib/types'

type Feedback = { kind: 'ok' | 'error' | 'info'; text: string }

const errorFeedback = (text: string): Feedback => ({ kind: 'error', text })

const escapeHtml = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

const highlight = (code: string): string =>
  escapeHtml(code)
    .replace(/(--.*)/g, '<span class="comment">$1</span>')
    .replace(/::/g, '<span class="operator">::</span>')
    .replace(/\b(import|qualified|as|instance|data|deriving|where|class|type)\b/g, '<span class="keyword">$1</span>')
    .replace(/\b([a-z][A-Za-z0-9_']*)\b(?=\s*[=(])/g, '<span class="function">$1</span>')

const headerOf = (problem: ProblemDetail): string => {
  switch (problem.problem_type) {
    case 'infer_type':
      return '✏️ Type Signature'
    case 'find_function':
      return '🔍 Function Implementation'
    case 'predict_behavior':
      return '🎯 Behavior Prediction'
    default:
      return '✏️ Question'
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
      return '📌 Question:'
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

const isChoice = (display: Display): display is ChoiceDisplay => display.problem_type === 'predict_behavior'
const isText = (display: Display): display is TextDisplay =>
  display.problem_type === 'infer_type' || display.problem_type === 'find_function'

export const QuizRoute = (): JSX.Element => {
  const navigate = useNavigate()
  const params = useParams<{ slug: string }>()
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

  Effect.runPromise(Effect.sync(() => params.slug))
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
        <div class="mainFrame">
          <RouteTitle>Quiz</RouteTitle>
          <div class="terminal">
            <div class="loading-text">Loading...</div>
          </div>
        </div>
      }
    >
      {(() => {
        const p = problem() as ProblemDetail
        return (
          <div class="mainFrame">
            <RouteTitle>Quiz</RouteTitle>
            <div class="terminal">
              <div class="header">
                <span class="title">{headerOf(p)}</span>
                <span class="progressInfo">{progressText()}</span>
              </div>

              <div class="questionArea">
                <span class="questionLabel">{labelOf(p)}</span>
                <div class="codeBlock" innerHTML={highlight(codeOf(p))} />
              </div>

              <Show
                when={p.problem_type !== 'predict_behavior'}
                fallback={
                  <div class="choiceArea">
                    <span class="choiceLabel">Choose one option:</span>
                    <div class="choiceOptions">
                      <For each={isChoice(p.display) ? p.display.options : []}>
                        {(opt, i) => (
                          <button
                            type="button"
                            class="choiceOption"
                            classList={{ selected: selected() === i() }}
                            onClick={() => setSelected(i())}
                          >
                            <span class="choiceIndex">{String.fromCharCode(65 + i())}</span>
                            <span class="choiceText">{opt}</span>
                          </button>
                        )}
                      </For>
                    </div>
                  </div>
                }
              >
                <div class="typeSignatureArea">
                  <span class="typeSignatureLabel">✏️ Input:</span>
                  <div class="typeInputWrapper">
                    <span class="typeInputPrefix">{prefixOf(p)}</span>
                    <input
                      type="text"
                      class="typeInput"
                      value={answer()}
                      onInput={(e) => {
                        setAnswer(e.currentTarget.value)
                        setFeedback(null)
                      }}
                    />
                  </div>
                </div>
              </Show>

              <div class="submitArea">
                <button type="button" class="submitBtn secondary" onClick={reset}>
                  ↻ Reset
                </button>
                <button type="button" class="submitBtn" onClick={submit} disabled={submitting()}>
                  ✓ Submit
                </button>
              </div>

              <Show when={feedback() !== null}>
                <div class={`feedback ${feedback()?.kind ?? ''}`}>{feedback()?.text ?? ''}</div>
              </Show>

              <div class="footerLine">
                <span>λ Monad Beat</span>
                <span>Haskell Practice</span>
              </div>
            </div>
          </div>
        )
      })()}
    </Show>
  )
}