import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { loadMonsters } from '../data/loaders'
import type { HitZones, Monster, ZoneRow } from '../types'
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

// Hit-zone heat map, as the MHFU LookUp colours it: a cell's background by value tier.
function hzBg(v: number) {
  if (v >= 66) return '#2e5e2e'   // dark green: very weak
  if (v >= 46) return '#6b3d00'   // dark orange
  if (v >= 21) return '#5a5200'   // dark yellow
  return '#383838'                // dark grey: resistant
}

export default function MonstersPage() {
  const { id } = useParams()
  const [data, setData] = useState<{ zoneTypes: string[]; classes: string[]; monsters: Monster[] }>({ zoneTypes: [], classes: [], monsters: [] })
  const [size, setSize] = useState('large')
  useEffect(() => { loadMonsters().then(setData) }, [])

  // Listed under their class, in the classes' order; a monster opened by link shows its own size's list.
  const mon = data.monsters.find(m => m.id === id)
  useEffect(() => { if (mon) setSize(mon.small ? 'small' : 'large') }, [mon])
  const icon = useMonsterIcons()
  const entries = useMemo(() => {
    const rank = (c: string) => { const i = (data.classes ?? []).indexOf(c); return i < 0 ? 99 : i }
    return data.monsters
      .filter(m => (size === 'small') === m.small)
      .sort((a, b) => rank(a.class) - rank(b.class) || a.name.localeCompare(b.name))
      .map(m => ({ key: m.id, label: m.name, group: m.class || 'Unclassified', search: m.class, icon: icon(m.id) }))
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
                  <td className="tbl-cell" style={{ textTransform: 'capitalize' }}>{p.extract}</td>
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

// The table for one state, as the Monster Viewer builds it (render/monster.js meatTableFor): table 0, with each slot the
// first rule that holds puts on its table-1 row.
interface ZoneState { rung?: number; ladder?: number; mode?: number; ctl?: number; rage?: boolean;
                      broken: (k: string) => boolean; heat: (region: string) => boolean }
function stateTable(hz: HitZones, st: ZoneState): ZoneRow[] {
  const rows = hz.tables[0].slice()
  const done = new Set<number>()
  const all = (k: string | string[]) => ([] as string[]).concat(k)
  for (const r of hz.rules ?? []) {
    if (done.has(r.slot) || !hz.tables[1]?.[r.row]) continue
    if (r.rung && !r.rung.includes(st.rung ?? 0)) continue
    if (r.ladder && !r.ladder.includes(st.ladder ?? 0)) continue
    if (r.rage !== undefined && r.rage !== !!st.rage) continue
    if (r.mode && !r.mode.includes(st.mode ?? 0)) continue
    if (r.ctl && !r.ctl.includes(st.ctl ?? 0)) continue
    if (r.broken && !all(r.broken).every(st.broken)) continue
    if (r.intact && all(r.intact).some(st.broken)) continue
    if (r.heat && !st.heat(r.heat)) continue
    rows[r.slot] = hz.tables[1][r.row]
    done.add(r.slot)
  }
  return rows
}

// The Hit Zones panel's controls: the Damage Table dropdown (the states the monster's tables follow) and the switches for
// the parts whose state moves a row (Broken Parts, Mud, ...), each under its heading, as the viewer lists them.
function HitZoneSection({ hz, types }: { hz: HitZones; types: string[] }) {
  const scale = useTextScale()
  const [pick, setPick] = useState(0)
  const [broken, setBroken] = useState<Set<string>>(new Set())
  const [heated, setHeated] = useState(false)
  const [beamHeated, setBeamHeated] = useState(false)
  const st = hz.state
  const table = useMemo(() => {
    if (st?.axis === 'table') return hz.tables[pick]
    const s: ZoneState = { broken: k => broken.has(k), heat: r => heated || (beamHeated && !!hz.heat?.beam.includes(r)) }
    if (st?.axis === 'mode') s.mode = pick
    if (st?.axis === 'level') { s.rung = pick; s.rage = !!st.rage?.[pick] }
    if (st?.axis === 'rage') s.rage = pick === 1
    if (st?.axis === 'ctl') s.ctl = st.values?.[pick]
    if (st?.axis === 'ladder') s.ladder = st.values?.[pick]
    return stateTable(hz, s)
  }, [hz, st, pick, broken, heated, beamHeated])
  const flip = (k: string) => setBroken(b => { const n = new Set(b); if (n.has(k)) n.delete(k); else n.add(k); return n })
  const sections = [...new Set((hz.switches ?? []).map(s => s.section))]
  const ctlStyle = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 4, color: 'var(--text)',
                     padding: '3px 6px', fontSize: 12 * scale }
  const check = (on: boolean, change: () => void, label: string) => (
    <label key={label} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginRight: 14, fontSize: 12 * scale, cursor: 'pointer' }}>
      <input type="checkbox" checked={on} onChange={change} />{label}
    </label>
  )
  const row = (key: string, name: string, r: ZoneRow | undefined) => (
    <tr key={key} className="tbl-row">
      <td className="tbl-cell" style={{ whiteSpace: 'nowrap' }}>{name}</td>
      {types.map(t => {
        const v = r?.[t] ?? 0
        return <td key={t} className="tbl-cell" style={{ textAlign: 'center', background: hzBg(v), color: 'var(--text)' }}>{v}</td>
      })}
    </tr>
  )
  return (
    <Section title="Hit Zones">
      {(st && st.names.length > 1) || hz.switches || hz.heat ? (
        <div style={{ margin: '0 0 8px', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {st && st.names.length > 1 && (
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 * scale }}>
              <span className="text-muted">Damage Table</span>
              <select value={pick} onChange={e => setPick(+e.target.value)} style={ctlStyle}>
                {st.names.map((n, i) => <option key={i} value={i}>{n}</option>)}
              </select>
            </label>
          )}
          {hz.heat && (
            <div>
              {check(heated, () => setHeated(h => !h), 'Heated')}
              {hz.heat.beam.length > 0 && check(beamHeated, () => setBeamHeated(h => !h), 'Beam heated')}
            </div>
          )}
          {sections.map(sec => (
            <div key={sec}>
              {sec && <div className="text-muted" style={{ fontSize: 11 * scale, marginBottom: 2 }}>{sec}</div>}
              {hz.switches!.filter(s => s.section === sec).map(s => check(broken.has(s.key), () => flip(s.key), s.name))}
            </div>
          ))}
        </div>
      ) : null}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse' }}>
          <thead><tr>
            <th className="tbl-header" style={{ textAlign: 'left' }}>Zone</th>
            {types.map(t => <th key={t} className="tbl-header" style={{ textAlign: 'right' }}>{ZONE_LABELS[t]}</th>)}
          </tr></thead>
          <tbody>
            {hz.rows.map(z => row(`s${z.slot}`, z.name, table[z.slot]))}
            {hz.arm?.rows.map(z => row(`a${z.slot}`, z.name, hz.arm!.table[z.slot]))}
          </tbody>
        </table>
      </div>
    </Section>
  )
}
