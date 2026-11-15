import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { BASE } from '../utils/assets'
import { useTextScale } from '../theme/textScale'
import AppLinks from './AppLinks'
import { NAV } from '../nav'

export default function Layout() {
  const loc = useLocation()
  const scale = useTextScale()
  const [linksOpen, setLinksOpen] = useState(false)
  const isActive = (path: string) => loc.pathname === `/${path}` || loc.pathname.startsWith(`/${path}/`)

  // Touch devices can leave the just-tapped nav link focused after a client-side route change,
  // which reads as "still selected"; deselect it on every navigation.
  useEffect(() => {
    const el = document.activeElement
    if (el instanceof HTMLElement && el.closest('nav')) el.blur()
  }, [loc.pathname])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <nav style={{
        minHeight: 44,
        backgroundColor: 'var(--surface)',
        backgroundImage: `linear-gradient(rgba(var(--surface-rgb), 0.93), rgba(var(--surface-rgb), 0.93)), url(${BASE}/assets/Textures/surface_bg.png)`,
        backgroundRepeat: 'no-repeat, repeat',
        borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'stretch', overflow: 'hidden',
      }}>
        <div style={{ padding: '0 12px', borderRight: '1px solid var(--border)', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
          <span style={{ color: 'var(--accent)', fontWeight: 600, fontSize: 15 * scale, whiteSpace: 'nowrap' }}>MHGU LookUp</span>
        </div>

        <div className="nav-tabs" style={{ display: 'flex', alignItems: 'stretch', flex: 1, overflowX: 'auto' }}>
          {NAV.map(item => (
            <NavLink key={item.path} to={`/${item.path}`}
                     title={item.soon ? `${item.label} (coming soon)` : item.label}
                     className={isActive(item.path) ? 'nav-tab active' : 'nav-tab'}
                     style={{
                       display: 'flex', alignItems: 'center', padding: '0 10px', flexShrink: 0,
                       textDecoration: 'none', whiteSpace: 'nowrap', fontSize: 13 * scale,
                       color: item.soon ? 'var(--muted)' : 'var(--text)', opacity: item.soon ? 0.6 : 1,
                     }}>
              {item.label}
            </NavLink>
          ))}
        </div>

        <button onClick={() => setLinksOpen(true)} title="Other MHGU apps" aria-label="Other MHGU apps" style={{
          background: 'none', border: 'none', borderLeft: '1px solid var(--border)', cursor: 'pointer',
          padding: '0 12px', fontSize: 16 * scale, flexShrink: 0,
        }}>&#128279;</button>
      </nav>

      <main style={{
        flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column',
        backgroundColor: 'var(--panel)',
        backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.30), rgba(0, 0, 0, 0.30)), linear-gradient(rgba(var(--panel-rgb), 0.88), rgba(var(--panel-rgb), 0.88)), url(${BASE}/assets/Textures/nav_bg.png)`,
        backgroundRepeat: 'no-repeat, no-repeat, repeat',
      }}>
        <Outlet />
      </main>

      {linksOpen && <AppLinks onClose={() => setLinksOpen(false)} />}
    </div>
  )
}
