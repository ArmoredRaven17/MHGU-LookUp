import { useEffect, useMemo, useState } from 'react'
import { questPrefix } from '../data/questPrefix'
import { Link, useParams } from 'react-router-dom'
import { loadArts, loadWeaponIndex } from '../data/loaders'
import type { ArtUnlock, HunterArt, QuestRef } from '../types'
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
// Each weapon's colour on the Guild Card, as the MHGU Save Editor shows it (mhgu-editor PlayerTab.tsx WEAPON_DISPLAY).
const CARD_COLOR: Record<string, string> = {
  w00: '#ff505b', w07: '#9beaf1', w01: '#dfd65f', w11: '#6ac083', w02: '#c3a3d2', w12: '#f89a64', w03: '#9fbcff',
  w09: '#f4baf5', w08: '#aaaaaa', w14: '#fc5800', w13: '#f5f5f5', w06: '#acd56b', w04: '#f8899c', w10: '#55edc4',
}

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
    .map(g => ({ key: g.key, label: g.name, group: g.weapon ? classes[g.weapon] ?? g.weapon : 'Generic',
                 groupColor: g.weapon ? CARD_COLOR[g.weapon] : undefined })), [groups, classes])
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
              <div style={{ marginTop: 10, fontSize: 13 * scale }}>
                <div className="text-muted" style={{ fontSize: 12 * scale, marginBottom: 2 }}>How to Get It</div>
                <ul style={{ margin: 0, paddingLeft: 18 }}>
                  {t.unlock.map((u, i) => <li key={i} style={{ marginBottom: 2 }}>{i > 0 && <span className="text-muted">or </span>}<Unlock u={u} /></li>)}
                </ul>
              </div>
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

const QuestLink = ({ q }: { q: QuestRef }) => (
  <><span className="text-muted">{questPrefix(q.category, q.stars)}:</span> <Link to={`/quests/${q.quest}`}>{q.title}</Link></>
)
const article = (name: string) => (/^[AEIOU]/i.test(name) ? 'an' : 'a')

// One way the game teaches an Art (tools/build_arts_unlocks.py says where each is read).
function Unlock({ u }: { u: ArtUnlock }) {
  switch (u.kind) {
    case 'start': return <>From the start.</>
    case 'quest': return <>Clear <QuestLink q={u} />.</>
    case 'quests': return <>Clear {u.quests.map((q, i) => <span key={q.quest}>{i > 0 && ' and '}<QuestLink q={q} /></span>)}.</>
    case 'progress': {
      const parts = [u.village && `unlock Village ${u.village} Quests`, u.hr && `reach HR ${u.hr}`, u.hub && `unlock ${u.hub} Quests`]
        .filter(Boolean) as string[]
      const text = parts.join(', or ')
      return <>{text.charAt(0).toUpperCase() + text.slice(1)}.</>
    }
    case 'requests': return <>Complete {u.count} Villager Requests in {u.village}.</>
    case 'contribution': return <>Earn {u.points} Contribution Points in {u.village}.</>
    case 'hunt': return (
      <>Hunt {u.monsters.map((m, i) => (
        <span key={m.id}>{i > 0 && ' or '}{article(m.name)} <Link to={`/monsters/${m.id}`}>{m.name}</Link></span>
      ))}.</>
    )
    case 'palico': return <>Raise a Palico to Lv {u.level}.</>
  }
}
