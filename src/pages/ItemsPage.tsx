import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { loadItems, loadSources } from '../data/loaders'
import type { Item } from '../types'
import ListPage, { DetailHeader, Section } from '../components/ListPage'
import BookmarkButton from '../components/BookmarkButton'
import NotesBox from '../components/NotesBox'
import GameText from '../components/GameText'
import { useTextScale } from '../theme/textScale'

// The game has no item categories; these group the items' icon shapes (see tools/build_data.py).
const CATEGORIES = ['Consumables', 'Tools & Traps', 'Ammo & Coatings', 'Plants & Mushrooms', 'Bugs & Fish',
  'Ore & Minerals', 'Monster Materials', 'Other Materials', 'Kinsect Extracts', 'Scraps', 'Armor Spheres',
  'Tickets & Coins', 'Relics & Charms', 'Books', 'Other']
type Source = [string, string, string, number | null]   // kind, where, detail, percent
const KINDS = ['Shop', 'Combining', 'Monster', 'Gathering', 'Quest reward']
const HEADINGS: Record<string, string> = {
  Shop: 'Shop', Combining: 'Combining', Monster: 'Monsters', Gathering: 'Gathering', 'Quest reward': 'Quest Rewards',
}

export default function ItemsPage() {
  const { id } = useParams()
  const scale = useTextScale()
  const [items, setItems] = useState<Item[]>([])
  const [sources, setSources] = useState<Record<string, Source[]>>({})
  useEffect(() => { loadItems().then(setItems); loadSources().then(setSources) }, [])

  const [cat, setCat] = useState('all')
  const entries = useMemo(() => [...items]
    .filter(i => cat === 'all' || i.category === cat)
    .sort((a, b) => CATEGORIES.indexOf(a.category) - CATEGORIES.indexOf(b.category) || a.name.localeCompare(b.name) || a.id - b.id)
    .map(i => ({ key: String(i.id), label: i.name, group: i.category })), [items, cat])
  const item = items.find(i => String(i.id) === id)
  const path = `/items/${id}`

  return (
    <ListPage entries={entries} base="/items" selected={id} placeholder="Search items…"
              emptyText="Select an item from the list."
              filter={{ value: cat, onChange: setCat,
                        options: [{ value: 'all', label: 'All items' }, ...CATEGORIES.map(c => ({ value: c, label: c }))] }}>
      {item && (
        <div style={{ maxWidth: 760 }}>
          <DetailHeader title={item.name} sub={item.category}>
            <BookmarkButton bookmark={{ type: 'item', id: String(item.id), name: item.name, path }} />
          </DetailHeader>
          <Section title="In-Game Description">
            <GameText text={item.desc} style={{ margin: 0, fontSize: 14 * scale }} />
          </Section>
          <Section title="Item">
            <p style={{ margin: 0, fontSize: 13 * scale }}>
              {item.buy != null && <>Buy {item.buy.toLocaleString()}z · </>}Sell {item.sell.toLocaleString()}z · Carry up to {item.carry}
            </p>
          </Section>
          <Section title="Where to Get It">
            <Sources list={sources[String(item.id)] ?? []} />
          </Section>
          <Section title="Notes">
            <NotesBox target={{ type: 'item', id: String(item.id), name: item.name, category: 'Item', path }} />
          </Section>
        </div>
      )}
    </ListPage>
  )
}

// Grouped by kind of source, then by where (a monster, a locale, a quest), best chance first.
function Sources({ list }: { list: Source[] }) {
  const scale = useTextScale()
  const [open, setOpen] = useState<Record<string, boolean>>({})
  const groups = useMemo(() => KINDS.map(kind => {
    const by = new Map<string, Source[]>()
    for (const s of list) if (s[0] === kind) by.set(s[1], [...(by.get(s[1]) ?? []), s])
    const rows = [...by.entries()]
      .map(([where, ss]) => ({ where, ss: ss.sort((a, b) => (b[3] ?? 0) - (a[3] ?? 0)), best: Math.max(...ss.map(s => s[3] ?? 0)) }))
      .sort((a, b) => b.best - a.best || a.where.localeCompare(b.where))
    return { kind, rows }
  }).filter(g => g.rows.length), [list])

  if (!groups.length) {
    return <p className="text-muted" style={{ margin: 0, fontSize: 13 * scale }}>
      No source read from the game yet. (Read so far: the item shop, combining, monster carves, captures and breaks,
      gathering, quest rewards.)
    </p>
  }
  return (
    <div>
      {groups.map(g => {
        const all = open[g.kind]
        const rows = all ? g.rows : g.rows.slice(0, 12)
        return (
          <div key={g.kind} style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 13 * scale, fontWeight: 600, marginBottom: 4 }}>
              {HEADINGS[g.kind]}
              <span className="text-muted" style={{ fontWeight: 400 }}> · {g.rows.length}</span>
            </div>
            <table style={{ borderCollapse: 'collapse', width: '100%' }}>
              <tbody>
                {rows.map(r => (
                  <tr key={r.where} className="tbl-row">
                    <td className="tbl-cell" style={{ verticalAlign: 'top', width: '34%' }}>{r.where}</td>
                    <td className="tbl-cell" style={{ fontSize: 12 * scale }}>
                      {r.ss.map((s, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                          <span className="text-muted">{s[2]}</span><span>{s[3] != null ? `${s[3]}%` : ''}</span>
                        </div>
                      ))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {g.rows.length > 12 && (
              <button className="chip" style={{ marginTop: 4, fontSize: 12 * scale }}
                      onClick={() => setOpen({ ...open, [g.kind]: !all })}>
                {all ? 'Show fewer' : `Show all ${g.rows.length}`}
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}
