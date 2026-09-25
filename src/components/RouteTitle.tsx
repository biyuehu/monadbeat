import { Title } from '@solidjs/meta'
import type { JSX } from 'solid-js'

export const RouteTitle = (props: { children: string }): JSX.Element => <Title>{props.children}</Title>
