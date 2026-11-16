import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { loadGathering } from '../data/loaders'
import type { GatherMap, GatherItem } from '../types'
import ListPage, { DetailHeader, Section } from '../components/ListPage'
import BookmarkButton from '../components/BookmarkButton'
import NotesBox from '../components/NotesBox'
import ItemName from '../components/ItemName'
import { useTextScale } from '../theme/textScale'

const RANKS = ['Low Rank', 'High Rank', 'G Rank']

export default function GatheringPage() {
  const { id } = useParams()
  const [maps, setMaps] = useState<GatherMap[]>([])
  const [rank, setRank] = useState('Low Rank')
  useEffect(() => { loadGathering().then(setMaps) }, [])

  const entries = useMemo(() => maps.map(m => ({
    key: String(m.map), label: m.name,
    sub: m.ranks.map(r => r.rank.replace(' Rank', '')).join(' · '),
    // search a locale by what can be gathered there
    search: [...new Set(m.ranks.flatMap(r => r.areas.flatMap(a => a.points.flatMap(p =>
      (p.items ?? p.outcomes?.flatMap(o => o.items) ?? p.baits?.flatMap(b => b.items) ?? []).map(i => i[0])))))].join(' '),
  })), [maps])
  const map = maps.find(m => String(m.map) === id)

  return (
    <ListPage entries={entries} base="/gathering" selected={id} placeholder="Search locales or items…"
              emptyText="Select a locale from the list. Search finds every locale an item can be gathered in.">
      {map && <MapDetail key={map.map} m={map} rank={rank} setRank={setRank} />}
    </ListPage>
  )
}

function Items({ items }: { items: GatherItem[] }) {
  return (
    <table style={{ borderCollapse: 'collapse' }}>
      <tbody>
        {[...items].sort((a, b) => b[2] - a[2]).map(([name, qty, pct], i) => (
          <tr key={i} className="tbl-row">
            <td className="tbl-cell" style={{ minWidth: 180 }}><ItemName name={name} />{qty > 1 && <span className="text-muted"> ×{qty}</span>}</td>
            <td className="tbl-cell" style={{ textAlign: 'right', width: 48 }}>{pct}%</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function MapDetail({ m, rank, setRank }: { m: GatherMap; rank: string; setRank: (r: string) => void }) {
  const scale = useTextScale()
  const path = `/gathering/${m.map}`
  const ranks = RANKS.filter(r => m.ranks.some(x => x.rank === r))
  const shown = m.ranks.find(r => r.rank === rank) ?? m.ranks[0]
  return (
    <div style={{ maxWidth: 900 }}>
      <DetailHeader title={m.name} sub="Gathering points and what each gives per gather">
        <BookmarkButton bookmark={{ type: 'gathering', id: String(m.map), name: m.name, path }} />
      </DetailHeader>

      <div style={{ display: 'flex', gap: 4, marginBottom: 14 }}>
        {ranks.map(r => (
          <button key={r} onClick={() => setRank(r)} className={r === shown.rank ? 'chip active' : 'chip'} style={{ fontSize: 12 * scale }}>{r}</button>
        ))}
      </div>

      {shown.areas.map(a => (
        <Section key={a.area} title={a.name}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {a.points.map((p, i) => (
              <div key={i} className="card" style={{ padding: '8px 10px' }}>
                <div style={{ fontSize: 12 * scale, fontWeight: 600, color: 'var(--accent)', marginBottom: 4 }}>
                  {p.kind}{p.random && <span className="text-muted" style={{ fontWeight: 400 }}> · random point</span>}
                </div>
                {p.items && <Items items={p.items} />}
                {p.outcomes?.map((o, k) => (
                  <div key={k} style={{ marginTop: k ? 8 : 0 }}>
                    <div className="text-muted" style={{ fontSize: 11 * scale, marginBottom: 2 }}>{o.chance}% of the time</div>
                    <Items items={o.items} />
                  </div>
                ))}
                {p.baits?.map((b, k) => (
                  <div key={k} style={{ marginTop: k ? 8 : 0 }}>
                    <div className="text-muted" style={{ fontSize: 11 * scale, marginBottom: 2 }}>{b.bait}</div>
                    <Items items={b.items} />
                  </div>
                ))}
              </div>
            ))}
          </div>
        </Section>
      ))}

      <p className="text-muted" style={{ fontSize: 12 * scale }}>
        The percentages are per gather. A random point uses one of its lists, chosen at the chance shown.
      </p>

      <Section title="Notes">
        <NotesBox target={{ type: 'gathering', id: String(m.map), name: m.name, category: 'Locale', path }} />
      </Section>
    </div>
  )
}
