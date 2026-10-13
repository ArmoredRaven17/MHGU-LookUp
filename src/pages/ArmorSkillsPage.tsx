import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { loadSkills } from '../data/loaders'
import type { SkillData, Skill, SkillTree } from '../types'
import ListPage, { DetailHeader, Section } from '../components/ListPage'
import BookmarkButton from '../components/BookmarkButton'
import NotesBox from '../components/NotesBox'
import GameText from '../components/GameText'
import Markdown from '../components/Markdown'
import { useTextScale } from '../theme/textScale'

const EXPLAINED = 'https://armoredraven17.github.io/mhgu-armor-skills-explained/'
const signColor = (n: number) => n > 0 ? 'var(--positive)' : 'var(--negative)'
const signStr = (n: number) => n > 0 ? `+${n}` : `${n}`

export default function ArmorSkillsPage() {
  const { id } = useParams()
  const [data, setData] = useState<SkillData>({ trees: [], skills: [] })
  useEffect(() => { loadSkills().then(setData) }, [])

  const skillById = useMemo(() => new Map(data.skills.map(s => [s.id, s])), [data])
  const entries = useMemo(() => [...data.trees]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(t => ({
      key: String(t.id), label: t.name,
      search: t.ladder.map(l => skillById.get(l.skill)?.name ?? '').join(' '),
    })), [data, skillById])
  const tree = data.trees.find(t => String(t.id) === id)

  return (
    <ListPage entries={entries} base="/armorskills" selected={id} placeholder="Search skill trees or skills…"
              emptyText="Select a skill tree from the list.">
      {tree && <TreeDetail tree={tree} skillById={skillById} />}
    </ListPage>
  )
}

function TreeDetail({ tree, skillById }: { tree: SkillTree; skillById: Map<number, Skill> }) {
  const scale = useTextScale()
  const path = `/armorskills/${tree.id}`
  // Positive skills first, best first; the negative ones after.
  const ladder = [...tree.ladder].sort((a, b) => (b.points > 0 ? 1 : 0) - (a.points > 0 ? 1 : 0) || Math.abs(a.points) - Math.abs(b.points))
  return (
    <div style={{ maxWidth: 760 }}>
      <DetailHeader title={tree.name} sub="Skill tree">
        <BookmarkButton bookmark={{ type: 'armorskill', id: String(tree.id), name: tree.name, path }} />
      </DetailHeader>
      <GameText text={tree.desc} style={{ margin: '0 0 16px', color: 'var(--muted)', fontStyle: 'italic', fontSize: 13 * scale }} />

      <Section title="Skill Levels">
        <table style={{ borderCollapse: 'collapse' }}>
          <thead><tr>
            <th className="tbl-header" style={{ textAlign: 'right', width: 64 }}>Points</th>
            <th className="tbl-header" style={{ textAlign: 'left' }}>Activated Skill</th>
            <th className="tbl-header" style={{ textAlign: 'left' }}>In-Game Description</th>
          </tr></thead>
          <tbody>
            {ladder.map(l => {
              const s = skillById.get(l.skill)
              return (
                <tr key={l.points} className="tbl-row">
                  <td className="tbl-cell" style={{ textAlign: 'right', color: signColor(l.points), fontWeight: 600 }}>{signStr(l.points)}</td>
                  <td className="tbl-cell" style={{ whiteSpace: 'nowrap' }}><a href={`#skill-${l.skill}`}>{s?.name}</a></td>
                  <td className="tbl-cell" style={{ color: 'var(--muted)' }}>{s?.desc}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </Section>

      {ladder.map(l => {
        const s = skillById.get(l.skill)
        if (!s) return null
        return (
          <div key={l.points} id={`skill-${s.id}`} className="card" style={{ marginBottom: 14 }}>
            <h3 style={{ margin: '0 0 4px', fontSize: 16 * scale, color: 'var(--accent)' }}>
              {s.name} <span style={{ color: signColor(l.points), fontSize: 13 * scale }}>({signStr(l.points)})</span>
            </h3>
            <p style={{ margin: '0 0 8px', color: 'var(--muted)', fontStyle: 'italic', fontSize: 13 * scale }}>{s.desc}</p>
            {s.explanation && <Markdown src={s.explanation} />}
            {s.grantedBy.length > 0 && (
              <p style={{ margin: '8px 0 0', fontSize: 12 * scale, color: 'var(--muted)' }}>
                Also granted by: {s.grantedBy.join(', ')}
              </p>
            )}
          </div>
        )
      })}

      <p style={{ fontSize: 12 * scale, color: 'var(--muted)' }}>
        The explanations are the ones written for <a href={EXPLAINED} target="_blank" rel="noopener">MHGU Armor Skills Explained</a>.
      </p>

      <Section title="Notes">
        <NotesBox target={{ type: 'armorskill', id: String(tree.id), name: tree.name, category: 'Skill tree', path }} />
      </Section>
    </div>
  )
}
