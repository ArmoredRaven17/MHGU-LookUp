import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { loadMonsters } from '../data/loaders'
import type { HitZones, Monster } from '../types'
import ListPage, { DetailHeader, Section } from '../components/ListPage'
import { useMonsterIcons } from '../data/icons'
import BookmarkButton from '../components/BookmarkButton'
import NotesBox from '../components/NotesBox'
import { useTextScale } from '../theme/textScale'

const ZONE_LABELS: Record<string, string> = {
  cut: 'Cut', impact: 'Impact', shot: 'Shot', fire: 'Fire', water: 'Water', ice: 'Ice',
  thunder: 'Thunder', dragon: 'Dragon', stun: 'Stun', exhaust: 'Exhaust',
}
const SIZE_FILTER = [
  { value: 'large', label: 'Large monsters' },
  { value: 'small', label: 'Small monsters' },
]

// Hit-zone heat map, as the MHFU LookUp colours it: a cell's background by value tier. Raw and element values run on
// different ranges (Raven, 2026-11-14: "Element and Raw use similar values numerically, but you will find their ranges
// are quite different"), so each has its own thresholds, set at the same places in its spread over every hit-zone row
// in the game: raw (cut/impact/shot) has a median of 35 and 90% at or below 63; element (fire/water/thunder/ice/dragon)
// a median of 10, 75% at or below 15, 90% at or below 25. Stun and exhaust keep the raw tiers.
const ELEMENTS = new Set(['fire', 'water', 'thunder', 'ice', 'dragon'])
const TIERS = { raw: [66, 46, 21], element: [25, 15, 10] }
function hzBg(v: number, type: string) {
  const [green, orange, yellow] = ELEMENTS.has(type) ? TIERS.element : TIERS.raw
  if (v >= green) return '#2e5e2e'   // dark green: very weak
  if (v >= orange) return '#6b3d00'  // dark orange
  if (v >= yellow) return '#5a5200'  // dark yellow
  return '#383838'                   // dark grey: resistant
}

export default function MonstersPage() {
  const { id } = useParams()
  const [data, setData] = useState<{ zoneTypes: string[]; classes: string[]; monsters: Monster[] }>({ zoneTypes: [], classes: [], monsters: [] })
  const [size, setSize] = useState('large')
  useEffect(() => { loadMonsters().then(setData) }, [])

  // Listed as the Monster Viewer lists them: under their class, in the classes' order, each class in the viewer's own
  // order (variants next to their monster); a monster opened by link shows its own size's list.
  const mon = data.monsters.find(m => m.id === id)
  useEffect(() => { if (mon) setSize(mon.small ? 'small' : 'large') }, [mon])
  const icon = useMonsterIcons()
  const entries = useMemo(() => {
    const rank = (c: string) => { const i = (data.classes ?? []).indexOf(c); return i < 0 ? 99 : i }
    const pos = new Map(data.monsters.map((m, i) => [m.id, i]))      // monsters.json is in the viewer's order
    return data.monsters
      .filter(m => (size === 'small') === m.small)
      .sort((a, b) => rank(a.listClass ?? a.class) - rank(b.listClass ?? b.class) || pos.get(a.id)! - pos.get(b.id)!)
      .map(m => ({ key: m.id, label: m.name, group: m.listClass ?? (m.class || 'Unclassified'), search: m.class, icon: icon(m.id) }))
  }, [data, size, icon])

  return (
    <ListPage entries={entries} base="/monsters" selected={id} placeholder="Search monsters…"
              emptyText="Select a monster from the list." filter={{ value: size, options: SIZE_FILTER, onChange: setSize }}>
      {mon && <MonsterDetail key={mon.id} m={mon} types={data.zoneTypes} />}
    </ListPage>
  )
}

function MonsterDetail({ m, types }: { m: Monster; types: string[] }) {
  const scale = useTextScale()
  const icon = useMonsterIcons()
  const path = `/monsters/${m.id}`
  return (
    <div style={{ maxWidth: 900 }}>
      <DetailHeader title={m.name} icon={icon(m.id)} sub={[m.class, m.small ? 'Small monster' : 'Large monster'].filter(Boolean).join(' · ')}>
        <BookmarkButton bookmark={{ type: 'monster', id: m.id, name: m.name, path }} />
      </DetailHeader>

      {m.quests.length > 0 && (
        <Section title="Fought In">
          <p style={{ margin: 0, fontSize: 13 * scale }}>
            {m.quests.map(([rank, n]) => `${rank} (${n} quest${n === 1 ? '' : 's'})`).join(' · ')}
          </p>
        </Section>
      )}

      {m.hz && <HitZoneSection hz={m.hz} types={types} />}

      {m.hz && m.hz.parts.length > 0 && (
        <Section title="Parts">
          <table style={{ borderCollapse: 'collapse' }}>
            <thead><tr>
              {['Part', 'Stagger', 'Break', 'Extract'].map(h => <th key={h} className="tbl-header" style={{ textAlign: 'left' }}>{h}</th>)}
            </tr></thead>
            <tbody>
              {m.hz.parts.map((p, i) => (
                <tr key={i} className="tbl-row">
                  <td className="tbl-cell" style={{ whiteSpace: 'nowrap' }}>{p.name}</td>
                  <td className="tbl-cell">{p.stagger}</td>
                  <td className="tbl-cell">{p.break ?? '—'}</td>
                  <ExtractCell extract={p.extract} />
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      )}

      <Section title="Notes">
        <NotesBox target={{ type: 'monster', id: m.id, name: m.name, category: m.class || 'Monster', path }} />
      </Section>
    </div>
  )
}

// The four kinsect extract colours, as the Monster Viewer paints them (render/monster.js EXTRACT_RGB), with dark or
// light text by the colour's luminance as its Parts table does.
const EXTRACT_RGB: Record<string, [number, number, number]> = {
  red: [0.78, 0.16, 0.16], orange: [0.90, 0.52, 0.13], white: [0.88, 0.88, 0.90], green: [0.30, 0.68, 0.30],
}
function ExtractCell({ extract }: { extract: string }) {
  const c = EXTRACT_RGB[extract]
  if (!c) return <td className="tbl-cell" style={{ textAlign: 'center' }}>{extract || '—'}</td>
  const lum = 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]
  return (
    <td className="tbl-cell" style={{ textAlign: 'center', textTransform: 'capitalize', fontWeight: 600,
      background: `rgb(${c.map(x => Math.round(x * 255)).join(',')})`, color: lum > 0.45 ? '#101216' : '#f2f4f8' }}>
      {extract}
    </td>
  )
}

function HitZoneSection({ hz, types }: { hz: HitZones; types: string[] }) {
  return (
    <Section title="Hit Zones">
      <div style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse' }}>
          <thead><tr>
            <th className="tbl-header" style={{ textAlign: 'left' }}>Zone</th>
            {types.map(t => <th key={t} className="tbl-header" style={{ textAlign: 'right' }}>{ZONE_LABELS[t]}</th>)}
          </tr></thead>
          <tbody>
            {hz.zones.map((z, i) => (
              <tr key={i} className="tbl-row">
                <td className="tbl-cell" style={{ whiteSpace: 'nowrap' }}>{z.name}</td>
                {types.map(t => {
                  const v = z.row[t] ?? 0
                  return <td key={t} className="tbl-cell" style={{ textAlign: 'center', background: hzBg(v, t), color: 'var(--text)' }}>{v}</td>
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Section>
  )
}
