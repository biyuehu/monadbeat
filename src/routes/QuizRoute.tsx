import { useNavigate, useParams } from '@solidjs/router'
import { Effect } from 'effect'
import { createEffect, createSignal, For, type JSX, Show } from 'solid-js'
import { RouteTitle } from '../components/RouteTitle'
import { fetchProblems } from '../lib/api'
import type { FindFunctionConfig, InferTypeConfig, PredictBehaviorConfig, Problem } from '../lib/schema'

type Feedback = { kind: 'ok' | 'error' | 'info'; text: string }

const escapeHtml = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

const highlight = (code: string): string =>
  escapeHtml(code)
    .replace(/(--.*)/g, '<span class="comment">$1</span>')
    .replace(/::/g, '<span class="operator">::</span>')
    .replace(/\b(import|qualified|as|instance|data|deriving|where|class|type)\b/g, '<span class="keyword">$1</span>')
    .replace(/\b([a-z][A-Za-z0-9_']*)\b(?=\s*[=(])/g, '<span class="function">$1</span>')

const headerOf = (problem: Problem): string => {
  switch (problem.problem_type) {
    case 'infer_type':
      return '✏️ Type Signature'
    case 'find_function':
      return '🔍 Function Implementation'
    case 'predict_behavior':
      return '🎯 Behavior Prediction'
  }
}

const labelOf = (problem: Problem): string => {
  switch (problem.problem_type) {
    case 'infer_type':
      return '📌 Write the type signature of the function below:'
    case 'find_function':
      return '📌 Implement a function that matches the following type signature:'
    case 'predict_behavior':
      return 'What happens when the following code runs?'
  }
}

const prefixOf = (problem: Problem): string => {
  switch (problem.problem_type) {
    case 'infer_type':
      return 'f ::'
    case 'find_function':
      return 'target = '
    case 'predict_behavior':
      return ''
  }
}

const codeOf = (problem: Problem): string => {
  switch (problem.problem_type) {
    case 'infer_type':
      return (problem.judge_config as InferTypeConfig).display_snippet
    case 'find_function': {
      const cfg = problem.judge_config as FindFunctionConfig
      return `${cfg.display_snippet}\n\n${cfg.scaffold.replace('{{USER_CODE}}', '-- implement here')}`
    }
    case 'predict_behavior':
      return (problem.judge_config as PredictBehaviorConfig).display_code
  }
}

const optionsOf = (problem: Problem): readonly string[] =>
  problem.problem_type === 'predict_behavior' ? (problem.judge_config as PredictBehaviorConfig).options : []

const correctIndexOf = (problem: Problem): number =>
  problem.problem_type === 'predict_behavior' ? (problem.judge_config as PredictBehaviorConfig).correct_index : -1

export const QuizRoute = (): JSX.Element => {
  const navigate = useNavigate()
  const params = useParams<{ id: string }>()
  const [problems, setProblems] = createSignal<readonly Problem[]>([])
  const [currentId, setCurrentId] = createSignal<number | null>(null)
  const [answer, setAnswer] = createSignal('')
  const [selected, setSelected] = createSignal(-1)
  const [feedback, setFeedback] = createSignal<Feedback | null>(null)
  const [submitting, setSubmitting] = createSignal(false)

  Effect.runPromise(fetchProblems)
    .then(setProblems)
    .catch((e) => setFeedback({ kind: 'error', text: String(e) }))

  createEffect(() => {
    const idParam = params.id
    const list = problems()
    const id = idParam !== undefined ? Number(idParam) : Number.NaN
    const fallback = list[0]?.id ?? null
    setCurrentId(Number.isFinite(id) ? id : fallback)
  })

  const current = (): Problem | undefined => problems().find((p) => p.id === currentId())

  const goNext = (): void => {
    const list = problems()
    const idx = list.findIndex((p) => p.id === currentId())
    const next = list[idx + 1]
    if (next === undefined) navigate('/')
    else navigate(`/quiz/${next.id}`)
  }

  const reset = (): void => {
    setAnswer('')
    setSelected(-1)
    setFeedback(null)
  }

  const submit = (): void => {
    const problem = current()
    if (problem === undefined || submitting()) return
    setSubmitting(true)
    if (problem.problem_type === 'predict_behavior') {
      if (selected() === -1) {
        setFeedback({ kind: 'info', text: '⚠️ Please choose an option!' })
        setSubmitting(false)
        return
      }
      const ok = selected() === correctIndexOf(problem)
      setFeedback({ kind: ok ? 'ok' : 'error', text: ok ? '✅ Correct! Moving on...' : '❌ Try again.' })
      if (ok) setTimeout(goNext, 700)
      setSubmitting(false)
      return
    }
    if (answer().trim() === '') {
      setFeedback({ kind: 'info', text: '⚠️ Please enter your answer!' })
      setSubmitting(false)
      return
    }
    // TODO: replace with backend POST /submissions once ready
    setFeedback({ kind: 'error', text: '❌ Grading not wired to backend yet.' })
    setSubmitting(false)
  }

  return (
    <Show
      when={current() !== undefined}
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
        const problem = current() as Problem
        return (
          <div class="mainFrame">
            <RouteTitle>Quiz</RouteTitle>
            <div class="terminal">
              <div class="header">
                <span class="title">{headerOf(problem)}</span>
                <span class="progressInfo">
                  {problems().findIndex((p) => p.id === problem.id) + 1} / {problems().length}
                </span>
              </div>

              <div class="questionArea">
                <span class="questionLabel">{labelOf(problem)}</span>
                <div class="codeBlock" innerHTML={highlight(codeOf(problem))} />
              </div>

              <Show
                when={problem.problem_type !== 'predict_behavior'}
                fallback={
                  <div class="choiceArea">
                    <span class="choiceLabel">Choose one option:</span>
                    <div class="choiceOptions">
                      <For each={optionsOf(problem)}>
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
                    <span class="typeInputPrefix">{prefixOf(problem)}</span>
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
