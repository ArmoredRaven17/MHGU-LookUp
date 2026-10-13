import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { loadArts } from '../data/loaders'
import type { HunterArt } from '../types'
import ListPage, { DetailHeader, Section } from '../components/ListPage'
import BookmarkButton from '../components/BookmarkButton'
import NotesBox from '../components/NotesBox'
import GameText from '../components/GameText'
import { useTextScale } from '../theme/textScale'

// An Art's tiers are separate rows in the game, named "<Art> I" / "II" / "III"; they are listed
// together under the Art's name. The route key is the first tier's id.
const baseName = (n: string) => n.replace(/ (I|II|III)$/, '')

export default function HunterArtsPage() {
  const { id } = useParams()
  const scale = useTextScale()
  const [arts, setArts] = useState<HunterArt[]>([])
  useEffect(() => { loadArts().then(setArts) }, [])

  const groups = useMemo(() => {
    const m = new Map<string, HunterArt[]>()
    for (const a of arts) m.set(baseName(a.name), [...(m.get(baseName(a.name)) ?? []), a])
    return [...m.entries()].map(([name, tiers]) => ({ name, tiers, key: String(tiers[0].id) }))
  }, [arts])
  const entries = useMemo(() => [...groups].sort((a, b) => a.name.localeCompare(b.name))
    .map(g => ({ key: g.key, label: g.name })), [groups])
  const group = groups.find(g => g.key === id)
  const path = `/arts/${id}`

  return (
    <ListPage entries={entries} base="/arts" selected={id} placeholder="Search Hunter Arts…"
              emptyText="Select a Hunter Art from the list.">
      {group && (
        <div style={{ maxWidth: 720 }}>
          <DetailHeader title={group.name} sub={group.tiers.length > 1 ? `${group.tiers.length} tiers` : undefined}>
            <BookmarkButton bookmark={{ type: 'art', id: group.key, name: group.name, path }} />
          </DetailHeader>
          {group.tiers.map(t => (
            <div key={t.id} className="card" style={{ marginBottom: 12 }}>
              <h3 style={{ margin: '0 0 6px', fontSize: 15 * scale, color: 'var(--accent)' }}>{t.name}</h3>
              <GameText text={t.short} style={{ margin: '0 0 8px', color: 'var(--muted)', fontStyle: 'italic', fontSize: 13 * scale }} />
              <GameText text={t.full} style={{ margin: 0, fontSize: 13 * scale }} />
            </div>
          ))}
          <Section title="Notes">
            <NotesBox target={{ type: 'art', id: group.key, name: group.name, category: 'Hunter Art', path }} />
          </Section>
        </div>
      )}
    </ListPage>
  )
}
