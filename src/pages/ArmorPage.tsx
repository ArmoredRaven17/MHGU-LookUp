import { useEffect, useMemo, useState } from 'react'
import { ELEMENT_COLOR } from '../data/elementColors'
import { useParams } from 'react-router-dom'
import { loadArmor } from '../data/loaders'
import type { ArmorSet } from '../types'
import ListPage, { DetailHeader, Section } from '../components/ListPage'
import BookmarkButton from '../components/BookmarkButton'
import NotesBox from '../components/NotesBox'
import GameText from '../components/GameText'
import { Materials, SlotsText } from '../components/Equipment'
import { useEquipIcons } from '../data/icons'
import { useTextScale } from '../theme/textScale'

const RES = ['Fire', 'Water', 'Thunder', 'Ice', 'Dragon']

const CLASSES = [
  { value: 'all', label: 'All armor' },
  { value: 'Blademaster', label: 'Blademaster' },
  { value: 'Gunner', label: 'Gunner' },
]

export default function ArmorPage() {
  const { id } = useParams()
  const [sets, setSets] = useState<ArmorSet[]>([])
  const [cls, setCls] = useState('all')
  useEffect(() => { loadArmor().then(setSets) }, [])

  const equip = useEquipIcons()
  const entries = useMemo(() => sets
    .filter(s => cls === 'all' || s.class === cls || s.class === 'Both')
    .map(s => ({
      key: String(s.id), label: s.name, icon: equip.armor('Chest', s.rarity),
      group: s.event ? 'Event' : `RARE ${s.rarity}`,   // in the game's order: RARE 1..11, then the event sets
      sub: `Rarity ${s.rarity} · ${s.class === 'Both' ? 'Both' : s.class}${s.gender !== 'Both' ? ` · ${s.gender}` : ''}`,
      search: s.pieces.map(p => p.name + ' ' + p.skills.map(k => k[0]).join(' ')).join(' '),
    })), [sets, cls, equip])
  const set = sets.find(s => String(s.id) === id)

  return (
    <ListPage entries={entries} base="/armor" selected={id} placeholder="Search armor, pieces or skills…"
              emptyText="Select an armor set from the list."
              filter={{ value: cls, options: CLASSES, onChange: setCls }}>
      {set && <ArmorDetail key={set.id} s={set} />}
    </ListPage>
  )
}

function ArmorDetail({ s }: { s: ArmorSet }) {
  const scale = useTextScale()
  const path = `/armor/${s.id}`
  // Skill points summed over the set.
  const totals = useMemo(() => {
    const m = new Map<string, number>()
    for (const p of s.pieces) for (const [k, v] of p.skills) m.set(k, (m.get(k) ?? 0) + v)
    return [...m.entries()].sort((a, b) => b[1] - a[1])
  }, [s])

  const equip = useEquipIcons()
  return (
    <div style={{ maxWidth: 860 }}>
      <DetailHeader title={s.name} icon={equip.armor('Chest', s.rarity)}
                    sub={`Rarity ${s.rarity} · ${s.class === 'Both' ? 'Blademaster and Gunner' : s.class}${s.gender !== 'Both' ? ` · ${s.gender} only` : ''}`}>
        <BookmarkButton bookmark={{ type: 'armor', id: String(s.id), name: s.name, path }} />
      </DetailHeader>

      <Section title="Set">
        <table style={{ borderCollapse: 'collapse' }}>
          <tbody>
            <tr className="tbl-row"><td className="tbl-cell text-muted" style={{ paddingRight: 16 }}>Defense (each piece)</td>
              <td className="tbl-cell">{s.defense[0]}{s.defense.length > 1 && ` → ${s.defense[s.defense.length - 1]} at Lv ${s.defense.length}`}</td></tr>
            <tr className="tbl-row"><td className="tbl-cell text-muted" style={{ verticalAlign: 'top' }}>Resistances (each piece)</td>
              <td className="tbl-cell">
                {RES.map((r, i) => (
                  <div key={r}>
                    <span style={{ color: ELEMENT_COLOR[r], fontWeight: 600 }}>{r}</span>{' '}
                    <span style={{ color: s.res[i] > 0 ? 'var(--positive)' : s.res[i] < 0 ? 'var(--negative)' : undefined }}>
                      {s.res[i] > 0 ? '+' : ''}{s.res[i]}
                    </span>
                  </div>
                ))}
              </td></tr>
            {s.zenny > 0 && <tr className="tbl-row"><td className="tbl-cell text-muted">Forge price (each piece)</td>
              <td className="tbl-cell">{s.zenny}z</td></tr>}
            <tr className="tbl-row"><td className="tbl-cell text-muted" style={{ verticalAlign: 'top' }}>Skill points (full set)</td>
              <td className="tbl-cell">
                {totals.length ? totals.map(([k, v]) => (
                  <div key={k}>{k} <span style={{ color: v > 0 ? 'var(--positive)' : 'var(--negative)' }}>{v > 0 ? '+' : ''}{v}</span></div>
                )) : '—'}
              </td></tr>
          </tbody>
        </table>
      </Section>

      <Section title="Stats">
        <div style={{ overflowX: 'auto' }}>
          <table style={{ borderCollapse: 'collapse' }}>
            <thead><tr>
              {['Slot', 'Piece', 'Slots', 'Skills'].map(h => <th key={h} className="tbl-header" style={{ textAlign: 'left' }}>{h}</th>)}
            </tr></thead>
            <tbody>
              {s.pieces.map(p => (
                <tr key={p.slot} className="tbl-row">
                  <PieceCells p={p} rarity={s.rarity} />
                  <td className="tbl-cell" style={{ verticalAlign: 'top' }}><SlotsText n={p.slots} /></td>
                  <td className="tbl-cell" style={{ whiteSpace: 'nowrap', verticalAlign: 'top' }}>
                    {p.skills.map(([k, v]) => <div key={k}>{k} <span style={{ color: v > 0 ? 'var(--positive)' : 'var(--negative)' }}>{v > 0 ? '+' : ''}{v}</span></div>)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="Materials">
        <div style={{ overflowX: 'auto' }}>
          <table style={{ borderCollapse: 'collapse' }}>
            <thead><tr>
              {['Slot', 'Piece', 'Materials'].map(h => <th key={h} className="tbl-header" style={{ textAlign: 'left' }}>{h}</th>)}
            </tr></thead>
            <tbody>
              {s.pieces.map(p => (
                <tr key={p.slot} className="tbl-row">
                  <PieceCells p={p} rarity={s.rarity} />
                  <td className="tbl-cell"><Materials list mats={p.create ?? []} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      {s.upgrades.length > 0 && (
        <Section title="Upgrades (each piece)">
          <table style={{ borderCollapse: 'collapse' }}>
            <thead><tr>
              {['Level', 'Defense', 'Materials'].map(h => <th key={h} className="tbl-header" style={{ textAlign: 'left' }}>{h}</th>)}
            </tr></thead>
            <tbody>
              {s.upgrades.map((m, i) => (
                <tr key={i} className="tbl-row">
                  <td className="tbl-cell">Lv {i + 2}</td>
                  <td className="tbl-cell">{s.defense[i + 1]}</td>
                  <td className="tbl-cell"><Materials mats={m} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      )}

      <Section title="Descriptions">
        {s.pieces.map(p => (
          <div key={p.slot} style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 13 * scale, color: 'var(--accent)' }}>{p.name}</div>
            <GameText text={p.desc} style={{ margin: 0, fontSize: 13 * scale }} />
          </div>
        ))}
      </Section>

      <Section title="Notes">
        <NotesBox target={{ type: 'armor', id: String(s.id), name: s.name, category: `Rarity ${s.rarity}`, path }} />
      </Section>
    </div>
  )
}

// A piece's Slot (with its icon) and name cells, shared by the Stats and Materials tables.
function PieceCells({ p, rarity }: { p: ArmorSet['pieces'][number]; rarity: number }) {
  const scale = useTextScale()
  const equip = useEquipIcons()
  const icon = equip.armor(p.slot, rarity)
  return (
    <>
      <td className="tbl-cell text-muted" style={{ whiteSpace: 'nowrap', verticalAlign: 'top' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          {icon && <img src={icon} alt="" width={20 * scale} height={20 * scale} style={{ imageRendering: 'pixelated' }} />}
          {p.slot}
        </span>
      </td>
      <td className="tbl-cell" style={{ whiteSpace: 'nowrap', verticalAlign: 'top' }} title={p.desc.replace(/\n/g, ' ')}>{p.name}</td>
    </>
  )
}
