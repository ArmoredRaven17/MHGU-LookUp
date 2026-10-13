import { useNavigate } from 'react-router-dom'
import { useNotes } from '../hooks/useNotes'
import { ENTITY_SECTIONS } from '../nav'
import { useTextScale } from '../theme/textScale'

// Every note written on a monster, quest, weapon, armor set, skill tree, Hunter Art or item page, grouped by kind.
export default function NotesPage() {
  const { notes, remove } = useNotes()
  const navigate = useNavigate()
  const scale = useTextScale()

  const groups = ENTITY_SECTIONS
    .map(s => ({ ...s, entries: notes.filter(n => n.type === s.type).sort((a, b) => a.name.localeCompare(b.name)) }))
    .filter(g => g.entries.length > 0)

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
      <div style={{ maxWidth: 760 }}>
        <h1 style={{ margin: 0, fontSize: 22 * scale, fontWeight: 700 }}>Notes</h1>
        <p style={{ margin: '2px 0 12px', fontSize: 13 * scale, color: 'var(--muted)' }}>
          Write a note at the bottom of any monster, quest, weapon, armor set, skill tree, Hunter Art or item page. They are kept on this device.
        </p>
        {groups.length === 0 && <p style={{ color: 'var(--muted)', fontSize: 13 * scale }}>No notes yet.</p>}
        {groups.map(g => (
          <div key={g.type} style={{ marginBottom: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 13 * scale, margin: '0 0 6px' }}>{g.header}</div>
            {g.entries.map(n => (
              <div key={n.type + n.id} className="card" style={{ marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button onClick={() => navigate(n.path)} style={{
                    background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                    color: 'var(--accent)', fontSize: 14 * scale, fontWeight: 600,
                  }}>{n.name}</button>
                  <span style={{ color: 'var(--muted)', fontSize: 12 * scale, flex: 1 }}>{n.category}</span>
                  <button onClick={() => remove(n.type, n.id)} title="Delete note" style={{
                    background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: 14 * scale,
                  }}>✕</button>
                </div>
                <p style={{ margin: '4px 0 0', whiteSpace: 'pre-wrap', fontSize: 13 * scale }}>{n.note}</p>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
