import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { loadPalico, type Palico, type PalicoArmor, type PalicoAttack, type PalicoWeapon } from '../data/loaders'
import ListPage, { DetailHeader, Section } from '../components/ListPage'
import GameText from '../components/GameText'
import { Materials, SHARP_COLOURS, SHARP_NAMES } from '../components/Equipment'
import { useTextScale } from '../theme/textScale'

// Route: /palicogear/w<row> (a weapon), /palicogear/h<row> (head armor), /palicogear/b<row> (body armor).
// Every label is the game's own text (palico.json `labels`).
const plain = (s: string) => s.replace(/<[^>]*>/g, '')
// Raven's colours for the three weapon types (the game shows all three in the same yellow): Balanced, Close Range, Boomerang
const STYLE_COLOURS = ['#b05ad8', '#e04848', '#3a8fe8']

function Sharp({ v }: { v: number }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <span style={{ width: 28, height: 10, background: SHARP_COLOURS[v], border: '1px solid var(--border)' }} />
      {SHARP_NAMES[v]}
    </span>
  )
}
const rare = (p: Palico, n: number) => p.labels.rare.replace('%d', String(n))

function viewOf(id: string | undefined) {
  if (id?.startsWith('h')) return 'head'
  if (id?.startsWith('b')) return 'body'
  return 'weapons'
}

export default function PalicoEquipmentPage() {
  const { id } = useParams()
  const [data, setData] = useState<Palico | null>(null)
  const [view, setView] = useState(viewOf(id))
  useEffect(() => { loadPalico().then(setData) }, [])
  useEffect(() => { if (id) setView(viewOf(id)) }, [id])

  const views = data ? [
    { value: 'weapons', label: data.labels.weapon },
    { value: 'head', label: data.labels.head },
    { value: 'body', label: data.labels.body },
  ] : []

  const entries = useMemo(() => {
    if (!data) return []
    if (view === 'weapons') {
      return data.weapons.map(w => ({ key: `w${w.id}`, label: w.name, group: rare(data, w.rarity),
        sub: `${w.atkType} · ${plain(w.style)}`, search: w.materials.map(m => m[0]).join(' '), r: w.rarity }))
        .sort((x, y) => x.r - y.r)
    }
    const list = view === 'head' ? data.head : data.body
    const prefix = view === 'head' ? 'h' : 'b'
    return list.map(a => ({ key: `${prefix}${a.id}`, label: a.name, group: rare(data, a.rarity),
      sub: `${data.labels.defense} ${a.defense}`, search: a.materials.map(m => m[0]).join(' '), r: a.rarity }))
      .sort((x, y) => x.r - y.r)
  }, [data, view])

  let detail = null
  if (data && id) {
    const row = +id.slice(1)
    if (id[0] === 'w') { const w = data.weapons.find(x => x.id === row); if (w) detail = <WeaponDetail key={id} data={data} w={w} /> }
    else {
      const a = (id[0] === 'h' ? data.head : data.body).find(x => x.id === row)
      if (a) detail = <ArmorDetail key={id} data={data} a={a} part={id[0] === 'h' ? data.labels.head : data.labels.body} />
    }
  }

  return (
    <ListPage entries={entries} base="/palicogear" selected={id} placeholder="Search equipment or materials…"
              emptyText="Select a piece of Palico equipment." filter={{ value: view, options: views, onChange: setView }}>
      {detail}
    </ListPage>
  )
}

function Row({ k, children }: { k: string; children: React.ReactNode }) {
  return <tr className="tbl-row"><td className="tbl-cell text-muted" style={{ whiteSpace: 'nowrap' }}>{k}</td><td className="tbl-cell">{children}</td></tr>
}

function AttackRows({ data, title, a, element }: { data: Palico; title: string; a: PalicoAttack; element: string | null }) {
  const L = data.labels
  return (
    <>
      <tr><td colSpan={2} className="tbl-header">{title}</td></tr>
      <Row k={L.attack}>{a.attack}</Row>
      <Row k={L.affinity}>{a.affinity}%</Row>
      {element && <Row k={L.element}>{element} {a.element}</Row>}
    </>
  )
}

function WeaponDetail({ data, w }: { data: Palico; w: PalicoWeapon }) {
  const scale = useTextScale()
  const L = data.labels
  return (
    <div style={{ maxWidth: 720 }}>
      <DetailHeader title={w.name} sub={rare(data, w.rarity)} />
      <GameText text={w.desc} style={{ margin: '0 0 10px', color: 'var(--muted)', fontStyle: 'italic', fontSize: 13 * scale }} />
      <Section title={L.equipment}>
        <table style={{ borderCollapse: 'collapse', fontSize: 13 * scale }}><tbody>
          <Row k={L.atkType}>{w.atkType}</Row>
          <tr className="tbl-row"><td className="tbl-cell" colSpan={2} style={{ color: STYLE_COLOURS[w.spType], fontWeight: 600 }}>{plain(w.style)}</td></tr>
          <Row k={L.sharpness}><Sharp v={w.sharpness} /></Row>
          {w.sharpness < 6 && <Row k={`+ ${L.handicraft}`}><Sharp v={w.sharpness + 1} /></Row>}
          <AttackRows data={data} title={L.melee} a={w.melee} element={w.elementType} />
          <AttackRows data={data} title={L.ranged} a={w.ranged} element={w.elementType} />
          {w.defense > 0 && <Row k={L.defense}>+{w.defense}</Row>}
        </tbody></table>
      </Section>
      <Section title={L.materials}><Materials mats={w.materials} /></Section>
    </div>
  )
}

function ArmorDetail({ data, a, part }: { data: Palico; a: PalicoArmor; part: string }) {
  const scale = useTextScale()
  const L = data.labels
  return (
    <div style={{ maxWidth: 720 }}>
      <DetailHeader title={a.name} sub={`${part} · ${rare(data, a.rarity)}`} />
      <GameText text={a.desc} style={{ margin: '0 0 10px', color: 'var(--muted)', fontStyle: 'italic', fontSize: 13 * scale }} />
      <Section title={L.equipment}>
        <table style={{ borderCollapse: 'collapse', fontSize: 13 * scale }}><tbody>
          <Row k={L.defense}>{a.defense}</Row>
          {L.res.map((r, i) => <Row key={r} k={r}>{a.res[i] > 0 ? `+${a.res[i]}` : a.res[i]}</Row>)}
        </tbody></table>
      </Section>
      <Section title={L.materials}><Materials mats={a.materials} /></Section>
    </div>
  )
}
