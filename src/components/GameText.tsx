import type { ReactNode } from 'react'

// The game's own message markup: <COL RRGGBBAA>…</COL> colours a run, <CNTR> centres the text.
// Any other tag is dropped. The game breaks lines to fit its text boxes; those breaks are joined
// back into running text (a word hyphenated at a break keeps its hyphen), except in centred text and
// where the game leaves a blank line.
// A "(Supply Item)" or "(Account Item)" tag always gets a line of its own (Raven, 2026-11-16), wherever the game put it.
const SUPPLY = /\s*(<COL [0-9A-Fa-f]{8}>\((?:Supply|Account) Item\)<\/COL>)/g

export default function GameText({ text, style }: { text: string; style?: React.CSSProperties }) {
  const centred = text.includes('<CNTR>')
  const marked = text.replace(SUPPLY, '\u2028$1')
  const flowed = (centred ? marked : marked.split(/\n{2,}/).map(p => p.replace(/-\n/g, '-').replace(/\n/g, ' ')).join('\n\n'))
    .replace(/\u2028/g, '\n')
  const out: ReactNode[] = []
  let colour: string | null = null
  let k = 0
  for (const part of flowed.replace(/<CNTR>/g, '').split(/(<COL [0-9A-Fa-f]{8}>|<\/COL>|<[^>]*>|\n)/)) {
    if (!part) continue
    const col = part.match(/^<COL ([0-9A-Fa-f]{6})[0-9A-Fa-f]{2}>$/)
    if (col) { colour = `#${col[1]}`; continue }
    if (part === '</COL>') { colour = null; continue }
    if (part === '\n') { out.push(<br key={k++} />); continue }
    if (part.startsWith('<')) continue
    out.push(colour
      ? <span key={k++} className="game-hl" style={{ color: colour === '#FF0000' ? undefined : colour }}>{part}</span>
      : part)
  }
  return <p style={{ textAlign: centred ? 'center' : undefined, ...style }}>{out}</p>
}
