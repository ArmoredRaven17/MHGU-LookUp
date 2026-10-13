import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { loadWeapons } from '../data/loaders'
import type { WeaponClass, Weapon } from '../types'
import ListPage, { DetailHeader, Section } from '../components/ListPage'
import BookmarkButton from '../components/BookmarkButton'
import NotesBox from '../components/NotesBox'
import GameText from '../components/GameText'
import { useTextScale } from '../theme/textScale'

// Route: /weapons/<class id>/<row>, e.g. /weapons/w10/65.
export default function WeaponsPage() {
  const { cls, row } = useParams()
  const navigate = useNavigate()
  const [classes, setClasses] = useState<WeaponClass[]>([])
  useEffect(() => { loadWeapons().then(setClasses) }, [])

  const current = classes.find(c => c.id === cls) ?? classes[0]
  const entries = useMemo(() => (current?.weapons ?? []).map(w => ({
    key: String(w.row), label: w.name, sub: `Rarity ${w.rarity}`,
    search: w.forms.map(f => f.name).join(' '),
  })), [current])
  const weapon = current?.weapons.find(w => String(w.row) === row)

  return (
    <ListPage entries={entries} base={`/weapons/${current?.id ?? ''}`} selected={row}
              placeholder="Search weapons…" emptyText="Select a weapon from the list."
              filter={{
                value: current?.id ?? '',
                options: classes.map(c => ({ value: c.id, label: c.name })),
                onChange: v => navigate(`/weapons/${v}`),
              }}>
      {weapon && current && <WeaponDetail cls={current} w={weapon} />}
    </ListPage>
  )
}

function WeaponDetail({ cls, w }: { cls: WeaponClass; w: Weapon }) {
  const scale = useTextScale()
  const path = `/weapons/${cls.id}/${w.row}`
  const stats: [string, string][] = [['Rarity', String(w.rarity)]]
  if (w.element) stats.push(['Element', w.element])
  if (w.phial) stats.push(['Phial', w.phial])
  if (w.shell) stats.push(['Shelling', `${w.shell.type} Lv ${w.shell.level}`])
  if (w.notes) stats.push(['Notes', w.notes.join(' · ')])
  if (w.charges) stats.push(['Charge levels', String(w.charges)])
  stats.push(['In the forge list', w.forge ? 'Yes' : 'No'])

  return (
    <div style={{ maxWidth: 720 }}>
      <DetailHeader title={w.name} sub={cls.name}>
        <BookmarkButton bookmark={{ type: 'weapon', id: `${cls.id}/${w.row}`, name: w.name, path }} />
      </DetailHeader>

      <Section title="Stats">
        <table style={{ borderCollapse: 'collapse' }}>
          <tbody>
            {stats.map(([k, v]) => (
              <tr key={k} className="tbl-row">
                <td className="tbl-cell" style={{ color: 'var(--muted)', paddingRight: 16 }}>{k}</td>
                <td className="tbl-cell">{v}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>

      <Section title="Names and Descriptions">
        {w.forms.map((f, i) => (
          <div key={i} className="card" style={{ marginBottom: 10 }}>
            <h3 style={{ margin: '0 0 6px', fontSize: 15 * scale, color: 'var(--accent)' }}>{f.name}</h3>
            <GameText text={f.text} style={{ margin: 0, fontSize: 13 * scale }} />
          </div>
        ))}
      </Section>

      <Section title="Notes">
        <NotesBox target={{ type: 'weapon', id: `${cls.id}/${w.row}`, name: w.name, category: cls.name, path }} />
      </Section>
    </div>
  )
}
