import { useEffect, useMemo, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { loadDecorations, loadSkills } from '../data/loaders'
import type { Decoration } from '../types'
import ListPage, { DetailHeader, Section } from '../components/ListPage'
import BookmarkButton from '../components/BookmarkButton'
import NotesBox from '../components/NotesBox'
import GameText from '../components/GameText'
import { Materials, SlotsText } from '../components/Equipment'
import { useItemIcons } from '../data/icons'
import { useTextScale } from '../theme/textScale'

const SLOT_FILTER = [
  { value: 'all', label: 'All decorations' },
  { value: '1', label: '1 slot' },
  { value: '2', label: '2 slots' },
  { value: '3', label: '3 slots' },
]

export default function DecorationsPage() {
  const { id } = useParams()
  const scale = useTextScale()
  const [decos, setDecos] = useState<Decoration[]>([])
  const [treeIds, setTreeIds] = useState<Map<string, number>>(new Map())
  const [slots, setSlots] = useState('all')
  useEffect(() => {
    loadDecorations().then(setDecos)
    loadSkills().then(d => setTreeIds(new Map(d.trees.map(t => [t.name, t.id]))))
  }, [])

  const icons = useItemIcons()
  const entries = useMemo(() => decos
    .filter(d => slots === 'all' || String(d.slots) === slots)
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(d => ({
      key: String(d.id), label: d.name, icon: icons.byId(d.id),
      search: d.skills.map(s => s[0]).join(' '),
    })), [decos, slots, icons])
  const deco = decos.find(d => String(d.id) === id)
  const path = `/decorations/${id}`

  return (
    <ListPage entries={entries} base="/decorations" selected={id} placeholder="Search decorations or skills…"
              emptyText="Select a decoration from the list." filter={{ value: slots, options: SLOT_FILTER, onChange: setSlots }}>
      {deco && (
        <div style={{ maxWidth: 680 }}>
          <DetailHeader title={deco.name} icon={icons.byId(deco.id)}>
            <BookmarkButton bookmark={{ type: 'decoration', id: String(deco.id), name: deco.name, path }} />
          </DetailHeader>
          <Section title="Decoration">
            <table style={{ borderCollapse: 'collapse' }}>
              <tbody>
                <tr className="tbl-row"><td className="tbl-cell text-muted" style={{ paddingRight: 16 }}>Slots needed</td>
                  <td className="tbl-cell"><SlotsText n={deco.slots} /></td></tr>
                <tr className="tbl-row"><td className="tbl-cell text-muted" style={{ verticalAlign: 'top' }}>Skill points</td>
                  <td className="tbl-cell">{deco.skills.map(([k, v]) => (
                    <div key={k}>
                      {treeIds.has(k) ? <Link to={`/armorskills/${treeIds.get(k)}`}>{k}</Link> : k}{' '}
                      <span style={{ color: v > 0 ? 'var(--positive)' : 'var(--negative)' }}>{v > 0 ? '+' : ''}{v}</span>
                    </div>
                  ))}</td></tr>
                {deco.recipes.map((r, i) => (
                  <tr key={i} className="tbl-row"><td className="tbl-cell text-muted">{deco.recipes.length > 1 ? `Recipe ${i + 1}` : 'Recipe'}</td>
                    <td className="tbl-cell"><Materials mats={r} /></td></tr>
                ))}
              </tbody>
            </table>
          </Section>
          <Section title="In-Game Description">
            <GameText text={deco.desc} style={{ margin: 0, fontSize: 14 * scale }} />
          </Section>
          <Section title="Notes">
            <NotesBox target={{ type: 'decoration', id: String(deco.id), name: deco.name, category: `${deco.slots}-slot`, path }} />
          </Section>
        </div>
      )}
    </ListPage>
  )
}
