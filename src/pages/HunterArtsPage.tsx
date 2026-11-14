import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { loadArts, loadWeaponIndex } from '../data/loaders'
import type { HunterArt } from '../types'
import ListPage, { DetailHeader, Section } from '../components/ListPage'
import BookmarkButton from '../components/BookmarkButton'
import NotesBox from '../components/NotesBox'
import GameText from '../components/GameText'
import { useTextScale } from '../theme/textScale'

// An Art's tiers are separate rows in the game, named "<Art> I" / "II" / "III"; they are listed
// together under the Art's name. The route key is the first tier's id.
const baseName = (n: string) => n.replace(/ (I|II|III)$/, '')

// The weapon order of the Guild Card's weapon usage (GuildCardMsg_eng 30..43): GS, LS, SnS, DB, Hammer, HH,
// Lance, GL, SA, CB, IG, LBG, HBG, Bow. The generic Arts come first.
const GUILD_CARD = ['w00', 'w07', 'w01', 'w11', 'w02', 'w12', 'w03', 'w09', 'w08', 'w14', 'w13', 'w06', 'w04', 'w10']
const rank = (w: string | null) => w == null ? -1 : GUILD_CARD.indexOf(w)

export default function HunterArtsPage() {
  const { id } = useParams()
  const scale = useTextScale()
  const [arts, setArts] = useState<HunterArt[]>([])
  const [classes, setClasses] = useState<Record<string, string>>({})
  useEffect(() => { loadArts().then(setArts); loadWeaponIndex().then(i => setClasses(Object.fromEntries(i.classes.map(c => [c.id, c.name])))) }, [])

  const groups = useMemo(() => {
    const m = new Map<string, HunterArt[]>()
    for (const a of arts) m.set(baseName(a.name), [...(m.get(baseName(a.name)) ?? []), a])
    return [...m.entries()].map(([name, tiers]) => ({ name, tiers, key: String(tiers[0].id), weapon: tiers[0].weapon, category: tiers[0].category }))
  }, [arts])
  // Generic Arts first, then by weapon in the Guild Card's order, each weapon's Arts in the game's own order
  const entries = useMemo(() => [...groups].sort((a, b) => rank(a.weapon) - rank(b.weapon) || a.category - b.category)
    .map(g => ({ key: g.key, label: g.name, group: g.weapon ? classes[g.weapon] ?? g.weapon : 'Generic' })), [groups, classes])
  const group = groups.find(g => g.key === id)
  const path = `/arts/${id}`

  return (
    <ListPage entries={entries} base="/arts" selected={id} placeholder="Search Hunter Arts…"
              emptyText="Select a Hunter Art from the list.">
      {group && (
        <div style={{ maxWidth: 720 }}>
          <DetailHeader title={group.name}
                        sub={[group.weapon ? classes[group.weapon] : 'Generic', group.tiers.length > 1 ? `${group.tiers.length} tiers` : ''].filter(Boolean).join(' · ')}>
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
