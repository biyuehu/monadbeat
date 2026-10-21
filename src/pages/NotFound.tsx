import { useNavigate } from '@solidjs/router'
import type { JSX } from 'solid-js'
import { FooterLine, Frame } from '../components/Frame'

export const NotFound = (): JSX.Element => {
  const navigate = useNavigate()

  return (
    <Frame title="404 Not Found">
      <div class="flex flex-col items-center justify-center py-20 px-4 text-center">
        <span class="text-7xl font-mono font-bold tracking-widest text-accent [text-shadow:0_0_30px_var(--glow)]">
          404
        </span>
        <h1 class="text-xl md:text-2xl font-bold mt-4 mb-2 text-strong">Page Not Found</h1>
        <p class="text-xs md:text-sm text-dim max-w-sm mb-8 leading-relaxed font-mono">
          The function or route you are looking for does not typecheck in this world.
        </p>

        <div class="flex gap-3">
          <button type="button" class="btn-sm btn-accent px-5 py-2" onClick={() => navigate('/')}>
            ← Return to Monad Beat
          </button>
        </div>
      </div>
      <FooterLine right="Status: 404" />
    </Frame>
  )
}
