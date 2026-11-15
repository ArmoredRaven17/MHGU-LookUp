import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useParams, Link } from 'react-router-dom'
import { loadQuests } from '../data/loaders'
import type { Quest } from '../types'
import ListPage, { DetailHeader, Section } from '../components/ListPage'
import BookmarkButton from '../components/BookmarkButton'
import NotesBox from '../components/NotesBox'
import GameText from '../components/GameText'
import { useTextScale } from '../theme/textScale'
import { useItemIcons, useMonsterIcons } from '../data/icons'

const CATEGORIES = ['Village', 'Hub', 'Special Permit', 'Arena', 'Event', 'Training']
const RANKS = ['Village Low Rank', 'Low Rank', 'High Rank', 'G Rank']

export default function QuestsPage() {
  const { id } = useParams()
  const [quests, setQuests] = useState<Quest[]>([])
  const [cat, setCat] = useState('Village')
  useEffect(() => { loadQuests().then(setQuests) }, [])

  // A quest opened by link shows its own category's list.
  const quest = quests.find(q => String(q.id) === id)
  useEffect(() => { if (quest) setCat(quest.category) }, [quest])

  // Village and Hub quests are grouped by stars; Special Permits by monster (below); the rest by rank.
  const byRank = cat === 'Event' || cat === 'Arena' || cat === 'Training'
  const icon = useTargetIcon()
  // Special Permits are listed by monster (Raven, 2026-11-14): the quest number is 40XXYY, XX the Deviant (01..18, the
  // game's order) and YY the permit level. The quest board records no group, so each XX is named by the monster most
  // of its quests target (its level 6 quests earn Wycademy Points, some levels add another monster).
  const permit = cat === 'Special Permit'
  const permitName = useMemo(() => {
    const votes = new Map<number, Map<string, number>>(), names = new Map<string, string>()
    for (const q of quests) {
      if (q.category !== 'Special Permit' || !q.target || !('monster' in q.target)) continue
      const g = Math.floor(q.id / 100) % 100, m = q.target.monster
      const v = votes.get(g) ?? new Map<string, number>()
      v.set(m, (v.get(m) ?? 0) + 1); votes.set(g, v)
      const n = q.monsters.find(x => x[0] === m)?.[1]
      if (n) names.set(m, n)
    }
    return new Map([...votes].map(([g, v]) => [g, names.get([...v].sort((a, b) => b[1] - a[1])[0][0]) ?? '']))
  }, [quests])
  const pgroup = (q: Quest) => Math.floor(q.id / 100) % 100
  const entries = useMemo(() => quests
    .filter(q => q.category === cat)
    .sort((a, b) => (permit ? pgroup(a) - pgroup(b) : 0)
      || (byRank ? RANKS.indexOf(a.rank) - RANKS.indexOf(b.rank) : a.level - b.level) || a.order - b.order)
    .map(q => ({
      key: String(q.id), label: q.title, icon: icon(q),
      sub: [permit ? q.stars : '', q.key ? 'Key Quest' : '', q.locale, byRank ? '' : q.rank].filter(Boolean).join(' · '),
      group: permit ? permitName.get(pgroup(q)) || q.stars : byRank ? q.rank || cat : q.stars,
      search: q.objective + ' ' + q.monsters.map(m => m[1]).join(' '),
    })), [quests, cat, byRank, icon, permit, permitName])

  return (
    <ListPage entries={entries} base="/quests" selected={id} placeholder="Search quests, objectives or monsters…"
              emptyText="Select a quest from the list."
              filter={{ value: cat, options: CATEGORIES.map(c => ({ value: c, label: c })), onChange: setCat }}>
      {quest && <QuestDetail key={quest.id} q={quest} />}
    </ListPage>
  )
}

// The main target's icon: the monster's, or the item's for a delivery (tools/build_quests.py `target`).
function useTargetIcon() {
  const monster = useMonsterIcons()
  const items = useItemIcons()
  return useMemo(() => (q: Quest) => !q.target ? undefined
    : 'monster' in q.target ? monster(q.target.monster) : items.byId(q.target.item), [monster, items])
}

function Row({ k, children }: { k: string; children: ReactNode }) {
  return (
    <tr className="tbl-row">
      <td className="tbl-cell text-muted" style={{ paddingRight: 16, whiteSpace: 'nowrap', verticalAlign: 'top' }}>{k}</td>
      <td className="tbl-cell">{children}</td>
    </tr>
  )
}

function QuestDetail({ q }: { q: Quest }) {
  const scale = useTextScale()
  const targetIcon = useTargetIcon()
  const path = `/quests/${q.id}`
  const z = (n: number) => `${n.toLocaleString()}z`
  return (
    <div style={{ maxWidth: 760 }}>
      <DetailHeader title={q.title} icon={targetIcon(q)} sub={[q.category, q.stars, q.rank, q.key ? 'Key Quest' : ''].filter(Boolean).join(' · ')}>
        <BookmarkButton bookmark={{ type: 'quest', id: String(q.id), name: q.title, path }} />
      </DetailHeader>

      <Section title="Quest">
        <table style={{ borderCollapse: 'collapse' }}>
          <tbody>
            <Row k="Main Objective"><GameText text={q.objective} style={{ margin: 0 }} /></Row>
            {q.subquest && <Row k="Subquest"><GameText text={q.subquest} style={{ margin: 0 }} />
              {(q.subReward > 0 || q.subHrp > 0) && <span className="text-muted"> ({z(q.subReward)}{q.subHrp ? `, ${q.subHrp} HRP` : ''})</span>}</Row>}
            <Row k="Failure"><GameText text={q.failure} style={{ margin: 0 }} /></Row>
            <Row k="Locale">{q.locale}</Row>
            <Row k="Time">{q.time} min.</Row>
            <Row k="Fee">{z(q.fee)}</Row>
            <Row k="Reward">{z(q.reward)}{q.hrp ? <span className="text-muted"> · {q.hrp} HRP</span> : null}</Row>
            <Row k="Requirements">{q.requirements.length ? q.requirements.join(', ') : 'None'}</Row>
            {q.monsters.length > 0 && (
              <Row k="Main Monsters">
                {q.monsters.map(([mid, name], i) => <span key={mid}>{i > 0 && ', '}<Link to={`/monsters/${mid}`}>{name}</Link></span>)}
              </Row>
            )}
            {q.others && q.others !== 'None' && <Row k="Other Monsters"><GameText text={q.others.replace(/\n/g, ', ')} style={{ margin: 0 }} /></Row>}
            <Row k="Client">{q.client}</Row>
          </tbody>
        </table>
      </Section>

      <Section title="Summary">
        <GameText text={q.desc} style={{ margin: 0, fontSize: 14 * scale }} />
      </Section>

      <Section title="Notes">
        <NotesBox target={{ type: 'quest', id: String(q.id), name: q.title, category: `${q.category} ${q.stars}`.trim(), path }} />
      </Section>
    </div>
  )
}
