import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { ELEMENT_COLOR } from '../data/elementColors'
import { ammoColor, coatingColor, shotColor } from '../data/gunColors'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { loadWeaponIndex, loadWeaponClass } from '../data/loaders'
import type { WeaponIndex, WeaponClass, Weapon, WeaponLevel } from '../types'
import ListPage, { DetailHeader, Section } from '../components/ListPage'
import BookmarkButton from '../components/BookmarkButton'
import NotesBox from '../components/NotesBox'
import GameText from '../components/GameText'
import { SharpnessBar, Materials, SlotsText } from '../components/Equipment'
import { useEquipIcons } from '../data/icons'
import { useTextScale } from '../theme/textScale'

// Route: /weapons/<class id>/<row>, e.g. /weapons/w10/65.
export default function WeaponsPage() {
  const { cls, row } = useParams()
  const navigate = useNavigate()
  const [index, setIndex] = useState<WeaponIndex | null>(null)
  const [data, setData] = useState<WeaponClass | null>(null)
  useEffect(() => { loadWeaponIndex().then(setIndex) }, [])
  const clsId = cls ?? index?.classes[0].id
  useEffect(() => { if (clsId) loadWeaponClass(clsId).then(setData) }, [clsId])

  const current = data?.id === clsId ? data : null
  const byRow = useMemo(() => new Map((current?.weapons ?? []).map(w => [w.row, w])), [current])
  const equip = useEquipIcons()
  const entries = useMemo(() => (current?.weapons ?? []).map(w => ({
    key: String(w.row), label: w.name, sub: `Rarity ${w.rarity}`, indent: w.depth, tree: true,
    search: w.forms.map(f => f.name).join(' '), icon: equip.weapon(current!.id, w.rarity),
  })), [current, equip])
  const weapon = current?.weapons.find(w => String(w.row) === row)

  return (
    <ListPage entries={entries} base={`/weapons/${clsId ?? ''}`} selected={row}
              placeholder="Search weapons…" emptyText="Select a weapon from the list. The list follows the upgrade tree."
              filter={{
                value: clsId ?? '',
                options: (index?.classes ?? []).map(c => ({ value: c.id, label: c.name })),
                onChange: v => navigate(`/weapons/${v}`),
              }}>
      {weapon && current && index && <WeaponDetail key={`${current.id}/${weapon.row}`} cls={current} w={weapon} byRow={byRow} sharpness={index.sharpness} />}
    </ListPage>
  )
}

function WeaponDetail({ cls, w, byRow, sharpness }: {
  cls: WeaponClass; w: Weapon; byRow: Map<number, Weapon>; sharpness: number[][]
}) {
  const scale = useTextScale()
  const top = w.levels[w.levels.length - 1].lv
  const [lv, setLv] = useState(top)
  const level = w.levels.find(l => l.lv === lv) ?? w.levels[w.levels.length - 1]
  const equip = useEquipIcons()
  const path = `/weapons/${cls.id}/${w.row}`
  const formAt = (n: number) => [...w.forms].reverse().find(f => f.from <= n) ?? w.forms[0]
  const from = w.from && byRow.get(w.from.row)
  const forgeHere = w.create?.find(c => c.level === lv)

  return (
    <div style={{ maxWidth: 820 }}>
      <DetailHeader title={formAt(lv).name} icon={equip.weapon(cls.id, w.rarity)} sub={`${cls.name} · Rarity ${w.rarity}${w.forms.length > 1 ? ` · ${w.name} line` : ''}`}>
        <BookmarkButton bookmark={{ type: 'weapon', id: `${cls.id}/${w.row}`, name: w.name, path }} />
      </DetailHeader>

      {w.levels.length > 1 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 14 }}>
          {w.levels.map(l => (
            <button key={l.lv} onClick={() => setLv(l.lv)} className={l.lv === lv ? 'chip active' : 'chip'}
                    style={{ fontSize: 12 * scale }}>Lv {l.lv}</button>
          ))}
        </div>
      )}

      <Section title={`Level ${level.lv}`}>
        <Stats w={w} l={level} sharpness={sharpness} />
      </Section>

      <Section title="Material List">
        <table style={{ borderCollapse: 'collapse' }}>
          <tbody>
            {(w.create ?? []).filter(c => c.level === lv).map(c => (
              <Row key={`f${c.level}`} k={c.level === 1 ? 'Forge' : `Forge at Lv ${c.level}`}><Materials list mats={c.mats} /></Row>
            ))}
            {from && (
              <Row k="Upgrade from">
                <Link to={`/weapons/${cls.id}/${from.row}`}>{from.name}</Link>
                <span className="text-muted"> at Lv {w.from!.level}</span>
                {w.levels[0].cost && <div style={{ marginTop: 4 }}><Materials list mats={w.levels[0].cost} /></div>}
              </Row>
            )}
            {level.lv > 1 && (
              <Row k={`Lv ${level.lv - 1} → ${level.lv}`}>
                <Materials list mats={level.cost ?? []} />
                {forgeHere && <div className="text-muted" style={{ marginTop: 4 }}>(or forge it at this level, above)</div>}
              </Row>
            )}
          </tbody>
        </table>
      </Section>

      {w.into.length > 0 && (
        <Section title="Upgrade Paths">
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 * scale }}>
            {w.into.map(t => {
              const to = byRow.get(t.row)
              return (
                <li key={t.row} style={{ margin: '2px 0' }}>
                  {to ? <Link to={`/weapons/${cls.id}/${t.row}`}>{to.name}</Link> : `#${t.row}`}
                  <span className="text-muted"> (Lv {t.level})</span>
                </li>
              )
            })}
          </ul>
        </Section>
      )}

      <Section title="Stats">
        <div style={{ overflowX: 'auto' }}>
          <table style={{ borderCollapse: 'collapse' }}>
            <thead><tr>
              {['Lv', 'Name', 'Attack', 'Affinity', w.element ? 'Element' : null, 'Slots'].filter(Boolean).map(h =>
                <th key={h} className="tbl-header" style={{ textAlign: 'left' }}>{h}</th>)}
            </tr></thead>
            <tbody>
              {w.levels.map(l => (
                <tr key={l.lv} className="tbl-row" onClick={() => setLv(l.lv)} style={{ cursor: 'pointer', outline: l.lv === lv ? '1px solid var(--accent)' : undefined }}>
                  <td className="tbl-cell">{l.lv}</td>
                  <td className="tbl-cell" style={{ whiteSpace: 'nowrap' }}>{formAt(l.lv).name}</td>
                  <td className="tbl-cell">{l.raw}</td>
                  <td className="tbl-cell">{l.aff}%</td>
                  {w.element && <td className="tbl-cell" style={{ whiteSpace: 'nowrap' }}>{elementText(w, l)}</td>}
                  <td className="tbl-cell"><SlotsText n={l.slots} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="Cost">
        <div style={{ overflowX: 'auto' }}>
          <table style={{ borderCollapse: 'collapse', width: '100%' }}>
            <thead><tr>
              {['Lv', 'Name', 'Materials'].map(h => <th key={h} className="tbl-header" style={{ textAlign: 'left' }}>{h}</th>)}
            </tr></thead>
            <tbody>
              {w.levels.map(l => (
                <tr key={l.lv} className="tbl-row" onClick={() => setLv(l.lv)} style={{ cursor: 'pointer', outline: l.lv === lv ? '1px solid var(--accent)' : undefined }}>
                  <td className="tbl-cell">{l.lv}</td>
                  <td className="tbl-cell" style={{ whiteSpace: 'nowrap' }}>{formAt(l.lv).name}</td>
                  <td className="tbl-cell"><Materials list mats={l.lv === 1 ? (w.create?.find(c => c.level === 1)?.mats ?? l.cost ?? []) : (l.cost ?? [])} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="Names and Descriptions">
        {w.forms.map(f => (
          <div key={f.name} className="card" style={{ marginBottom: 10 }}>
            <h3 style={{ margin: '0 0 6px', fontSize: 15 * scale, color: 'var(--accent)' }}>
              {f.name} <span className="text-muted" style={{ fontSize: 12 * scale, fontWeight: 400 }}>from Lv {f.from}</span>
            </h3>
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

// Each element in its colour (src/data/elementColors.ts), its value beside it
function elementText(w: Weapon, l: WeaponLevel) {
  const parts: [string, number | undefined][] = []
  if (w.element) parts.push([w.element, l.ele])
  if (w.element2) parts.push([w.element2, l.ele2])
  return (
    <>{parts.map(([e, v], i) => (
      <span key={e}>{i > 0 && ' / '}<span style={{ color: ELEMENT_COLOR[e], fontWeight: 600 }}>{e}</span> {v}</span>
    ))}</>
  )
}

function Row({ k, children }: { k: string; children: ReactNode }) {
  return (
    <tr className="tbl-row">
      <td className="tbl-cell" style={{ color: 'var(--muted)', paddingRight: 16, whiteSpace: 'nowrap', verticalAlign: 'top' }}>{k}</td>
      <td className="tbl-cell">{children}</td>
    </tr>
  )
}

function Stats({ w, l, sharpness }: { w: Weapon; l: WeaponLevel; sharpness: number[][] }) {
  const max = useMemo(() => Math.max(...sharpness.map(r => r[r.length - 1])), [sharpness])
  return (
    <>
      <table style={{ borderCollapse: 'collapse' }}>
        <tbody>
          <Row k="Attack">{l.raw}</Row>
          <Row k="Affinity">{l.aff}%</Row>
          {w.element && <Row k="Element">{elementText(w, l)}</Row>}
          {l.defense > 0 && <Row k="Defense">+{l.defense}</Row>}
          <Row k="Slots"><SlotsText n={l.slots} /></Row>
          {w.phial && <Row k="Phial">{w.phial}{l.phialValue ? ` ${l.phialValue}` : ''}</Row>}
          {w.shelling && <Row k="Shelling">{w.shelling} Lv {l.shellLv}</Row>}
          {l.notes && <Row k="Notes">{l.notes.join(' · ')}</Row>}
          {l.sharp && (
            <Row k="Sharpness">
              {[0, 1, 2].map(h => (
                <div key={h} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                  <SharpnessBar row={sharpness[l.sharp![0]]} length={l.sharp![1] + 25 * h} max={max} />
                  <span className="text-muted" style={{ fontSize: 11 }}>{h === 0 ? '' : `Handicraft +${h}`}</span>
                </div>
              ))}
            </Row>
          )}
          {l.bow && <>
            <Row k="Arc Shot">{l.bow.arc.replace('Arc Shot: ', '')}</Row>
            <Row k="Charge Shots">
              {l.bow.shots.map((s, i) => (
                <div key={i} style={{ color: shotColor(s), fontWeight: 600 }}>
                  {s}{i >= l.bow!.open && <span className="text-muted" style={{ fontWeight: 400 }} title="Needs the Load Up skill"> (Load Up)</span>}
                </div>
              ))}
            </Row>
            <Row k="Usable Coatings">
              {l.bow.coatings.map(c => {
                const boosted = l.bow!.boost?.includes(c)
                const col = coatingColor(c)
                return (
                  <div key={c} style={{ margin: '1px 0' }}>
                    <span style={{ color: boosted && col ? '#101216' : col, fontWeight: boosted ? 700 : 600, borderRadius: 4,
                      padding: boosted ? '0 6px' : undefined, background: boosted ? col : undefined }}
                          title={boosted ? 'Coating Boosts' : undefined}>{c}</span>
                  </div>
                )
              })}
            </Row>
          </>}
          {l.gun && <>
            <Row k="Reload">{l.gun.reload}</Row>
            <Row k="Recoil">{l.gun.recoil}</Row>
            <Row k="Deviation">{l.gun.deviation}</Row>
          </>}
        </tbody>
      </table>
      {l.gun && <GunTables g={l.gun} />}
    </>
  )
}

const ammoStyle = (a: string) => {
  const c = ammoColor(a)
  return c ? { color: c, fontWeight: 600 } : undefined
}

function GunTables({ g }: { g: NonNullable<WeaponLevel['gun']> }) {
  const scale = useTextScale()
  const small = { fontSize: 12 * scale }
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 18, marginTop: 10, alignItems: 'flex-start' }}>
      <div>
        <div style={{ ...small, fontWeight: 600, marginBottom: 4 }}>Ammo</div>
        <table style={{ borderCollapse: 'collapse' }}><tbody>
          {g.ammo.map(([a, c]) => <tr key={a} className="tbl-row"><td className="tbl-cell" style={ammoStyle(a)}>{a}</td><td className="tbl-cell" style={{ textAlign: 'right' }}>{c}</td></tr>)}
        </tbody></table>
      </div>
      {g.internal.length > 0 && (
        <div>
          <div style={{ ...small, fontWeight: 600, marginBottom: 4 }}>Internal Ammo</div>
          <table style={{ borderCollapse: 'collapse' }}>
            <thead><tr><th className="tbl-header">Ammo</th><th className="tbl-header">Total</th><th className="tbl-header">Clip</th></tr></thead>
            <tbody>{g.internal.map(([a, t, c]) => <tr key={a} className="tbl-row"><td className="tbl-cell" style={ammoStyle(a)}>{a}</td><td className="tbl-cell">{t}</td><td className="tbl-cell">{c}</td></tr>)}</tbody>
          </table>
        </div>
      )}
      {g.rapid && g.rapid.length > 0 && (
        <div>
          <div style={{ ...small, fontWeight: 600, marginBottom: 4 }}>Rapid Fire</div>
          <table style={{ borderCollapse: 'collapse' }}>
            <thead><tr><th className="tbl-header">Ammo</th><th className="tbl-header">Shots</th><th className="tbl-header">Power</th><th className="tbl-header">Wait</th></tr></thead>
            <tbody>{g.rapid.map(([a, s, p, wt]) => <tr key={a} className="tbl-row"><td className="tbl-cell" style={ammoStyle(a)}>{a}</td><td className="tbl-cell">{s}</td><td className="tbl-cell">{p}%</td><td className="tbl-cell">{wt}</td></tr>)}</tbody>
          </table>
        </div>
      )}
      {g.crouch && g.crouch.length > 0 && (
        <div>
          <div style={{ ...small, fontWeight: 600, marginBottom: 4 }}>Crouching Fire</div>
          <table style={{ borderCollapse: 'collapse' }}><tbody>
            {g.crouch.map(([a, c]) => <tr key={a} className="tbl-row"><td className="tbl-cell" style={ammoStyle(a)}>{a}</td><td className="tbl-cell" style={{ textAlign: 'right' }}>{c}</td></tr>)}
          </tbody></table>
        </div>
      )}
    </div>
  )
}
