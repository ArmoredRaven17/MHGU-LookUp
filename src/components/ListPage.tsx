import { useMemo, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import SearchBox from './SearchBox'
import CollapsiblePanel from './CollapsiblePanel'
import { BASE } from '../utils/assets'
import { useTextScale } from '../theme/textScale'

export interface ListEntry {
  key: string          // the route segment, e.g. the id
  label: string
  sub?: string         // a muted second line
  search?: string      // extra text the search box matches, beyond the label
  indent?: number      // depth in a tree (the weapons' upgrade tree); dropped while searching
  tree?: boolean       // draw `indent` as branch lines (│ ├ └) with a collapse toggle, as the MHFU LookUp does;
                       // the entries must then come in tree order (each child after its parent, one level deeper)
  group?: string       // a heading the entry is listed under (entries come already ordered by group)
  icon?: string        // an icon shown before the label (the game's own, see src/data/icons.ts)
  groupColor?: string  // the colour of this entry's group heading (default: the accent colour)
}

// The list + detail shell every lookup tab shares (from the MHFU LookUp): a resizable,
// collapsible list panel with an optional filter and a search box, and the detail beside it.
export default function ListPage({ entries, base, selected, placeholder, filter, emptyText, children }: {
  entries: ListEntry[]
  base: string                        // route of the tab, e.g. '/weapons'
  selected?: string
  placeholder: string
  filter?: { value: string; options: { value: string; label: string }[]; onChange: (v: string) => void }
  emptyText: string                   // shown when nothing is selected
  children?: ReactNode                // the detail of the selected entry
}) {
  const scale = useTextScale()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')

  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const toggle = (key: string) => setCollapsed(c => { const n = new Set(c); if (n.has(key)) n.delete(key); else n.add(key); return n })

  // Branch lines per entry (tree lists): one cell per level, 0 blank, 1 │, 2 ├, 3 └ (the last is its own).
  const lines = useMemo(() => treeLines(entries), [entries])

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (q) return entries.filter(e => (e.label + ' ' + (e.search ?? '')).toLowerCase().includes(q))
    if (!collapsed.size) return entries
    const out: ListEntry[] = []
    let hideBelow = -1                       // hide entries deeper than this until the branch ends
    for (const e of entries) {
      const d = e.indent ?? 0
      if (hideBelow >= 0 && d > hideBelow) continue
      hideBelow = -1
      out.push(e)
      if (e.tree && collapsed.has(e.key)) hideBelow = d
    }
    return out
  }, [entries, search, collapsed])
  const searching = !!search.trim()

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      <CollapsiblePanel width={250} style={{
        backgroundColor: 'var(--bg)',
        backgroundImage: `linear-gradient(rgba(var(--bg-rgb), 0.92), rgba(var(--bg-rgb), 0.92)), url(${BASE}/assets/Textures/content_bg.png)`,
        backgroundRepeat: 'no-repeat, repeat', borderRight: '1px solid var(--border)',
      }}>
        {filter && (
          <div style={{ padding: '6px 8px', borderBottom: '1px solid var(--border)' }}>
            <select value={filter.value} onChange={e => filter.onChange(e.target.value)} style={{
              width: '100%', background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 4, color: 'var(--text)', padding: '4px 6px', fontSize: 12 * scale,
            }}>
              {filter.options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        )}
        <SearchBox value={search} onChange={setSearch} placeholder={placeholder} />
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {shown.map((e, i) => {
            const active = e.key === selected
            const heading = e.group && e.group !== shown[i - 1]?.group
            return (
              <div key={e.key}>
              {heading && (
                <div style={{
                  padding: '8px 12px 3px', fontSize: 11 * scale, fontWeight: 700, color: 'var(--accent)',
                  textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid var(--border)',
                  ...(e.groupColor ? { color: e.groupColor } : {}),
                }}>{e.group}</div>
              )}
              <button onClick={() => navigate(`${base}/${e.key}`)} style={{
                display: 'block', width: '100%', padding: '5px 12px',
                paddingLeft: e.tree ? 6 : 12 + (searching ? 0 : Math.min(e.indent ?? 0, 8) * 10),
                background: active ? 'var(--header-bg)' : 'transparent',
                border: 'none', borderLeft: active ? '2px solid var(--accent)' : '2px solid transparent',
                color: active ? 'var(--accent)' : 'var(--text)',
                cursor: 'pointer', textAlign: 'left', fontSize: 13 * scale,
              }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {e.tree && !searching && (
                    <span style={{ display: 'flex', alignItems: 'center', flexShrink: 0, alignSelf: 'stretch', margin: '-5px 0' }}>
                      {(lines.get(e.key) ?? []).map((g, k) => <Guide key={k} g={g} />)}
                      {lines.get(`+${e.key}`)
                        ? <span onClick={ev => { ev.stopPropagation(); toggle(e.key) }} title={collapsed.has(e.key) ? 'Expand' : 'Collapse'}
                                style={{ width: 14, textAlign: 'center', cursor: 'pointer', color: 'var(--muted)' }}>
                            {collapsed.has(e.key) ? '▸' : '▾'}
                          </span>
                        : <span style={{ width: 14 }} />}
                    </span>
                  )}
                  {e.icon && <img src={e.icon} alt="" width={22 * scale} height={22 * scale} style={{ imageRendering: 'pixelated', flexShrink: 0 }} />}
                  <span>
                    {e.label}
                    {e.sub && <span style={{ display: 'block', color: 'var(--muted)', fontSize: 11 * scale }}>{e.sub}</span>}
                  </span>
                </span>
              </button>
              </div>
            )
          })}
          {shown.length === 0 && (
            <p style={{ color: 'var(--muted)', padding: 12, fontSize: 13 * scale }}>Nothing found.</p>
          )}
        </div>
      </CollapsiblePanel>

      <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
        {children ?? <p className="text-muted" style={{ marginTop: 16, fontSize: 14 * scale }}>{emptyText}</p>}
      </div>
    </div>
  )
}

// One branch-line cell, drawn as lines so they join across rows of any height: 1 │, 2 ├, 3 └.
function Guide({ g }: { g: number }) {
  const line = 'color-mix(in srgb, var(--text) 35%, transparent)'
  return (
    <span style={{ position: 'relative', width: 14, alignSelf: 'stretch', flexShrink: 0 }}>
      {g > 0 && <span style={{ position: 'absolute', left: 6, width: 1, top: 0, bottom: g === 3 ? '50%' : 0, background: line }} />}
      {g > 1 && <span style={{ position: 'absolute', left: 6, right: 0, top: '50%', height: 1, background: line }} />}
    </span>
  )
}

// For entries in tree order (each child right after its parent, one level deeper): the branch-line cells of
// each entry, keyed by its key, and `+key` set for the entries that have children.
function treeLines(entries: ListEntry[]) {
  const out = new Map<string, number[]>()
  const depth = entries.map(e => e.indent ?? 0)
  // whether entry i has a later sibling: scanning back, the nearest later entry at its depth before a shallower one
  const later = new Array(entries.length).fill(false)
  const seen: boolean[] = []                 // seen[d]: a later entry at depth d since the last shallower one
  for (let i = entries.length - 1; i >= 0; i--) {
    const d = depth[i]
    later[i] = !!seen[d]
    seen.length = d + 1
    seen[d] = true
  }
  const open: boolean[] = []                 // open[d]: the branch at level d continues below (draw │)
  entries.forEach((e, i) => {
    if (!e.tree) return
    const d = depth[i]
    const cells: number[] = []
    for (let k = 0; k < d - 1; k++) cells.push(open[k + 1] ? 1 : 0)
    if (d > 0) cells.push(later[i] ? 2 : 3)
    open[d] = later[i]
    out.set(e.key, cells)
    if (i + 1 < entries.length && depth[i + 1] > d) out.set(`+${e.key}`, [])
  })
  return out
}

/** A detail page's heading block, with room for the bookmark button. */
export function DetailHeader({ title, sub, icon, children }: { title: string; sub?: string; icon?: string; children?: ReactNode }) {
  const scale = useTextScale()
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {icon && <img src={icon} alt="" width={40 * scale} height={40 * scale} style={{ imageRendering: 'pixelated' }} />}
        <h2 style={{ margin: 0, color: 'var(--text)', fontSize: 20 * scale, fontWeight: 600 }}>{title}</h2>
        {children}
      </div>
      {sub && <p style={{ margin: '2px 0 0', color: 'var(--muted)', fontSize: 12 * scale }}>{sub}</p>}
    </div>
  )
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
  const scale = useTextScale()
  return (
    <div style={{ marginBottom: 18 }}>
      <h3 style={{
        margin: '0 0 6px', color: 'var(--text)', fontSize: 13 * scale,
        fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em',
      }}>{title}</h3>
      {children}
    </div>
  )
}
