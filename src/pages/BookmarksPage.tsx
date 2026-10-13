import { useNavigate } from 'react-router-dom'
import { useBookmarks, type Bookmark } from '../hooks/useBookmarks'
import { useTextScale } from '../theme/textScale'
import { ENTITY_SECTIONS } from '../nav'

export default function BookmarksPage() {
  const { bookmarks, remove } = useBookmarks()
  const navigate = useNavigate()
  const scale = useTextScale()

  const groups = ENTITY_SECTIONS
    .map(s => ({ ...s, entries: bookmarks.filter(b => b.type === s.type) }))
    .filter(g => g.entries.length > 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <div style={{ padding: '16px 16px 8px' }}>
        <h1 style={{ margin: 0, fontSize: 22 * scale, fontWeight: 700 }}>Bookmarks</h1>
        <p style={{ margin: '2px 0 0', fontSize: 13 * scale, color: 'var(--muted)' }}>
          Bookmark a monster, quest, weapon, armor set, skill tree, Hunter Art or item on its page, then click it here to jump straight back to it.
        </p>
      </div>
      {groups.length === 0 ? (
        <p style={{ padding: '4px 16px', margin: 0, color: 'var(--muted)', fontSize: 13 * scale }}>No bookmarks yet.</p>
      ) : (
        <div style={{ overflowY: 'auto', flex: 1, padding: '0 16px 16px' }}>
          {groups.map(g => (
            <div key={g.type}>
              <div style={{ fontWeight: 700, fontSize: 13 * scale, margin: '12px 0 2px' }}>{g.header}</div>
              {g.entries.map(bm => (
                <BookmarkRow key={bm.path} bm={bm} onOpen={() => navigate(bm.path)} onRemove={() => remove(bm.path)} />
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function BookmarkRow({ bm, onOpen, onRemove }: { bm: Bookmark; onOpen: () => void; onRemove: () => void }) {
  const scale = useTextScale()
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '2px 0' }}>
      <button onClick={onOpen} style={{
        flex: 1, background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
        padding: '4px 0', color: 'var(--text)', fontSize: 14 * scale,
      }}>{bm.name}</button>
      <button onClick={onRemove} title="Remove bookmark" style={{
        background: 'none', border: 'none', cursor: 'pointer',
        color: 'var(--muted)', fontSize: 14 * scale, padding: '4px 8px',
      }}>✕</button>
    </div>
  )
}
