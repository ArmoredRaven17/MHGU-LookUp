import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { loadMonsters } from '../data/loaders'
import type { Monster } from '../types'
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
  // Colour a hit-zone value: the higher, the more it takes.
  const shade = (v: number, physical: boolean) => {
    const hi = physical ? 45 : 20, mid = physical ? 25 : 10
    return v >= hi ? 'var(--positive)' : v >= mid ? 'var(--text)' : 'var(--muted)'
  }
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

      {m.zones?.map((table, ti) => (
        <Section key={ti} title={ti === 0 ? 'Hit Zones' : 'Hit Zones: Second Table'}>
          {ti > 0 && (
            <p className="text-muted" style={{ margin: '0 0 6px', fontSize: 12 * scale }}>
              The game keeps a second table for this monster. When it applies is not read from the game yet.
            </p>
          )}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ borderCollapse: 'collapse' }}>
              <thead><tr>
                <th className="tbl-header" style={{ textAlign: 'left' }}>Zone</th>
                {types.map(t => <th key={t} className="tbl-header" style={{ textAlign: 'right' }}>{ZONE_LABELS[t]}</th>)}
              </tr></thead>
              <tbody>
                {table.map((z, i) => (
                  <tr key={i} className="tbl-row">
                    <td className="tbl-cell" style={{ whiteSpace: 'nowrap' }}>{z.name}</td>
                    {z.values.map((v, k) => (
                      <td key={k} className="tbl-cell" style={{ textAlign: 'right', color: k < 8 ? shade(v, k < 3) : 'var(--muted)' }}>{v}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      ))}

      {m.parts && m.parts.length > 0 && (
        <Section title="Parts">
          <table style={{ borderCollapse: 'collapse' }}>
            <thead><tr>
              {['Part', 'Hit by zones', 'Stagger', 'Break', 'Extract'].map(h => <th key={h} className="tbl-header" style={{ textAlign: 'left' }}>{h}</th>)}
            </tr></thead>
            <tbody>
              {m.parts.map(p => (
                <tr key={p.n} className="tbl-row">
                  <td className="tbl-cell">{p.n}</td>
                  <td className="tbl-cell">{p.zones.join(', ') || '—'}</td>
                  <td className="tbl-cell">{p.stagger}</td>
                  <td className="tbl-cell">{p.break ?? '—'}</td>
                  <td className="tbl-cell" style={{ textTransform: 'capitalize' }}>{p.extract}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-muted" style={{ margin: '6px 0 0', fontSize: 12 * scale }}>
            The game numbers parts and never names them; the zone names are the community's, as the game has none.
          </p>
        </Section>
      )}

      <Section title="Notes">
        <NotesBox target={{ type: 'monster', id: m.id, name: m.name, category: m.class || 'Monster', path }} />
      </Section>
    </div>
  )
}
