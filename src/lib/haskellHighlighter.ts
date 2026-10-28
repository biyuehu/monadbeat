const escapeHtml = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

export const highlightHaskell = (code: string): string => {
  const tokens: string[] = []
  const stash = (html: string): string => {
    tokens.push(html)
    return `\uE000${tokens.length - 1}\uE000`
  }

  let text = escapeHtml(code)

  // 1. Comments: {- ... -} and -- ...
  text = text.replace(/(\{-[\s\S]*?-\})/g, (_, m: string) =>
    stash(`<span class="text-dim italic font-mono">${m}</span>`)
  )
  text = text.replace(/(--.*)/g, (_, m: string) => stash(`<span class="text-dim italic font-mono">${m}</span>`))

  // 2. String & Char literals: "..." and '...'
  text = text.replace(/(".*?")/g, (_, m: string) => stash(`<span class="text-emerald-400 font-mono">${m}</span>`))
  text = text.replace(/('(\\.|[^\\'])')/g, (_, m: string) =>
    stash(`<span class="text-emerald-400 font-mono">${m}</span>`)
  )

  // 3. Numbers:
  text = text.replace(/\b(\d+)\b/g, (_, m: string) => stash(`<span class="text-amber-400 font-mono">${m}</span>`))

  // 4. Haskell Core Operators: ->, <-, =>, ::, \
  text = text.replace(/(->|&lt;-|=&gt;|::|\\)/g, (_, m: string) =>
    stash(`<span class="text-accent font-bold">${m}</span>`)
  )

  // 5. Haskell Keywords:
  const keywords =
    '\\b(forall|module|where|import|qualified|as|hiding|type|data|newtype|class|instance|deriving|default|let|in|do|case|of|if|then|else)\\b'
  text = text.replace(new RegExp(keywords, 'g'), (_, m: string) =>
    stash(`<span class="text-purple-400 font-semibold">${m}</span>`)
  )

  // 6. Type names / Constructors (Capitalized words): e.g. Map, Int, Bool, List, Maybe, IO, Either
  text = text.replace(/\b([A-Z][A-Za-z0-9_']*)\b/g, (_, m: string) =>
    stash(`<span class="text-sky-400 font-semibold">${m}</span>`)
  )

  // 7. Function names at declaration: name = or name ::
  text = text.replace(/\b([a-z][A-Za-z0-9_']*)\b(?=\s*(::|=))/g, (_, m: string) =>
    stash(`<span class="text-soft font-bold">${m}</span>`)
  )

  // Restore stashed tokens
  return text.replace(/\uE000(\d+)\uE000/g, (_, i: string) => tokens[Number(i)] ?? '')
}
