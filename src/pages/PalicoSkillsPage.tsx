import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { loadPalico, type Palico, type PalicoMove, type PalicoSkill } from '../data/loaders'
import ListPage, { DetailHeader } from '../components/ListPage'
import GameText from '../components/GameText'
import { useTextScale } from '../theme/textScale'

// Route: /palicoskills/s<id> (a Palico Skill), /palicoskills/m<id> (a Support Move).
// Every label is the game's own text (palico.json `labels`).
const flat = (s: string) => s.replace(/-\n/g, '-').replace(/\n/g, ' ')

export default function PalicoSkillsPage() {
  const { id } = useParams()
  const [data, setData] = useState<Palico | null>(null)
  const [view, setView] = useState(id?.startsWith('m') ? 'moves' : 'skills')
  useEffect(() => { loadPalico().then(setData) }, [])
  useEffect(() => { if (id?.startsWith('m')) setView('moves'); else if (id?.startsWith('s')) setView('skills') }, [id])

  const views = data ? [{ value: 'skills', label: data.labels.skills }, { value: 'moves', label: data.labels.moves }] : []

  const entries = useMemo(() => {
    if (!data) return []
    if (view === 'moves') {
      // grouped by Type, in the game's order of the types (OtMenuMsg 28..33) and its own sort order within each
      const kinds = [...new Set(data.moves.map(m => m.kind))].sort((a, b) => a - b)
      return kinds.flatMap(k => data.moves.filter(m => m.kind === k).map(m => ({
        key: `m${m.id}`, label: m.name, group: m.type, sub: `${data.labels.gauge} ${m.gauge}`, search: flat(m.desc) })))
    }
    return data.skills.map(s => ({ key: `s${s.id}`, label: s.name, group: data.labels.skills,
      sub: `${data.labels.memory} ${s.memory}`, search: flat(s.desc) }))
  }, [data, view])

  let detail = null
  if (data && id) {
    const n = +id.slice(1)
    if (id[0] === 's') { const s = data.skills.find(x => x.id === n); if (s) detail = <SkillDetail key={id} data={data} s={s} /> }
    if (id[0] === 'm') { const m = data.moves.find(x => x.id === n); if (m) detail = <MoveDetail key={id} data={data} m={m} /> }
  }

  return (
    <ListPage entries={entries} base="/palicoskills" selected={id} placeholder="Search skills or moves…"
              emptyText="Select a Palico Skill or a Support Move." filter={{ value: view, options: views, onChange: setView }}>
      {detail}
    </ListPage>
  )
}

function Row({ k, children }: { k: string; children: React.ReactNode }) {
  return <tr className="tbl-row"><td className="tbl-cell text-muted" style={{ whiteSpace: 'nowrap', verticalAlign: 'top' }}>{k}</td><td className="tbl-cell">{children}</td></tr>
}

function SkillDetail({ data, s }: { data: Palico; s: PalicoSkill }) {
  const scale = useTextScale()
  const L = data.labels
  return (
    <div style={{ maxWidth: 720 }}>
      <DetailHeader title={s.name} sub={L.skills} />
      <GameText text={s.desc} style={{ margin: '0 0 10px', color: 'var(--muted)', fontStyle: 'italic', fontSize: 13 * scale }} />
      <table style={{ borderCollapse: 'collapse', fontSize: 13 * scale }}><tbody>
        <Row k={L.memory}>{s.memory}</Row>
        <Row k={L.conditions}><GameText text={s.condition} style={{ margin: 0 }} /></Row>
      </tbody></table>
    </div>
  )
}

function MoveDetail({ data, m }: { data: Palico; m: PalicoMove }) {
  const scale = useTextScale()
  const L = data.labels
  return (
    <div style={{ maxWidth: 720 }}>
      <DetailHeader title={m.name} sub={L.moves} />
      <GameText text={m.desc} style={{ margin: '0 0 10px', color: 'var(--muted)', fontStyle: 'italic', fontSize: 13 * scale }} />
      <table style={{ borderCollapse: 'collapse', fontSize: 13 * scale }}><tbody>
        <Row k={L.type}>{m.type}</Row>
        <Row k={L.gauge}>{m.gauge}</Row>
        <Row k={L.conditions}><GameText text={m.condition} style={{ margin: 0 }} /></Row>
      </tbody></table>
    </div>
  )
}
