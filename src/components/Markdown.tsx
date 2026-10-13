import type { ReactNode } from 'react'

// The Markdown subset the skill explanations are written in (the same one MHGU Armor Skills
// Explained renders): paragraphs, "- " lists, pipe tables, **bold**.
function inline(t: string): ReactNode[] {
  return t.split(/(\*\*.+?\*\*)/).map((s, i) =>
    s.startsWith('**') && s.endsWith('**') && s.length > 4 ? <strong key={i}>{s.slice(2, -2)}</strong> : s)
}

const isRow = (l: string) => l.trim().startsWith('|')
const isItem = (l: string) => /^\s*[-*] /.test(l)

export default function Markdown({ src }: { src: string }) {
  const lines = src.replace(/\r/g, '').split('\n')
  const out: ReactNode[] = []
  let i = 0
  while (i < lines.length) {
    const l = lines[i]
    if (!l.trim()) { i++; continue }
    if (isRow(l)) {
      const rows: string[] = []
      while (i < lines.length && isRow(lines[i])) rows.push(lines[i++].trim())
      const cells = (r: string) => r.replace(/^\||\|$/g, '').split('|').map(c => c.trim())
      const [head, ...rest] = rows.filter((r, k) => !(k === 1 && /^\|?\s*:?-{2,}/.test(r)))
      out.push(
        <div key={out.length} className="md-table">
          <table>
            <thead><tr>{cells(head).map((c, j) => <th key={j} className="tbl-header">{inline(c)}</th>)}</tr></thead>
            <tbody>{rest.map((r, k) => (
              <tr key={k} className="tbl-row">{cells(r).map((c, j) => <td key={j} className="tbl-cell">{inline(c)}</td>)}</tr>
            ))}</tbody>
          </table>
        </div>)
      continue
    }
    if (isItem(l)) {
      const items: string[] = []
      while (i < lines.length && isItem(lines[i])) {
        let item = lines[i++].replace(/^\s*[-*] /, '')
        while (i < lines.length && lines[i].trim() && !isItem(lines[i]) && !isRow(lines[i])) item += ' ' + lines[i++].trim()
        items.push(item)
      }
      out.push(<ul key={out.length}>{items.map((t, k) => <li key={k}>{inline(t)}</li>)}</ul>)
      continue
    }
    let para = l.trim(); i++
    while (i < lines.length && lines[i].trim() && !isRow(lines[i]) && !isItem(lines[i])) para += ' ' + lines[i++].trim()
    out.push(<p key={out.length}>{inline(para)}</p>)
  }
  return <div className="md">{out}</div>
}
