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

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase()
    return q ? entries.filter(e => (e.label + ' ' + (e.search ?? '')).toLowerCase().includes(q)) : entries
  }, [entries, search])

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
          {shown.map(e => {
            const active = e.key === selected
            return (
              <button key={e.key} onClick={() => navigate(`${base}/${e.key}`)} style={{
                display: 'block', width: '100%', padding: '5px 12px',
                paddingLeft: 12 + (search.trim() ? 0 : Math.min(e.indent ?? 0, 8) * 10),
                background: active ? 'var(--header-bg)' : 'transparent',
                border: 'none', borderLeft: active ? '2px solid var(--accent)' : '2px solid transparent',
                color: active ? 'var(--accent)' : 'var(--text)',
                cursor: 'pointer', textAlign: 'left', fontSize: 13 * scale,
              }}>
                {e.label}
                {e.sub && <span style={{ display: 'block', color: 'var(--muted)', fontSize: 11 * scale }}>{e.sub}</span>}
              </button>
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

/** A detail page's heading block, with room for the bookmark button. */
export function DetailHeader({ title, sub, children }: { title: string; sub?: string; children?: ReactNode }) {
  const scale = useTextScale()
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
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
