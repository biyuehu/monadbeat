import type { JSX } from 'solid-js'
import { RouteTitle } from './RouteTitle'

export const Frame = (props: {
  title: string
  class?: string
  flush?: boolean
  children: JSX.Element
}): JSX.Element => (
  <main class="flex flex-1 min-h-0 w-full max-w-300 mx-auto p-3 md:p-6">
    <RouteTitle>{props.title}</RouteTitle>
    <div class={`terminal ${props.flush === true ? '' : 'p-5 md:p-8 lg:px-10 lg:pb-10'} ${props.class ?? ''}`}>
      {props.children}
    </div>
  </main>
)

export const FooterLine = (props: { right: string; class?: string }): JSX.Element => (
  <div class={`footer-line ${props.class ?? ''}`}>
    <span>λ Monad Beat</span>
    <span>{props.right}</span>
  </div>
)
