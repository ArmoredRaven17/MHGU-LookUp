import { useEffect, useState, type ReactNode } from 'react'
import { loadHornSongs } from '../data/loaders'
import type { HornSong, HornSongs } from '../types'
import { useTextScale } from '../theme/textScale'
import { BASE } from '../utils/assets'

// The Hunting Horn's songs, laid out as the MHFU LookUp does (Raven, 2026-11-21: "Follow how the MHFU LookUP app
// handled it"): a "Songs…" button on the weapon list opens the full list; a horn's page lists the songs it can play.
// The notes are the game's note glyph in each note's colour (Raven: "color code the notes"; "we would want the note
// icons in place of words"; tools/build_horn_songs.py), named on hover.

export function useHornSongs() {
  const [data, setData] = useState<HornSongs | null>(null)
  useEffect(() => { loadHornSongs().then(setData) }, [])
  return data
}

// A horn plays a song when every note the song uses is one of the horn's notes (Raven: "Every note in its set").
export function songsFor(data: HornSongs, notes: string[]) {
  return data.songs.filter(s => s.notes.every(n => notes.includes(n)))
}

export function NoteIcons({ notes, size = 20 }: { notes: string[]; size?: number }) {
  const scale = useTextScale()
  return (
    <span style={{ display: 'inline-flex', gap: 2, verticalAlign: 'middle' }}>
      {notes.map((n, i) => (
        <img key={i} src={`${BASE}/icons/note/${n.toLowerCase().replace(/ /g, '-')}.png`} alt={n} title={n}
             width={size * scale} height={size * scale} style={{ imageRendering: 'pixelated', flexShrink: 0 }} />
      ))}
    </span>
  )
}

export function SongsButton() {
  const scale = useTextScale()
  const [open, setOpen] = useState(false)
  const data = useHornSongs()
  return (
    <>
      <button onClick={() => setOpen(true)} style={{
        background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 4,
        color: 'var(--text)', padding: '3px 8px', fontSize: 12 * scale, cursor: 'pointer',
      }}>Songs…</button>
      {open && (
        <Modal title="Hunting Horn Songs" onClose={() => setOpen(false)}>
          {data ? <SongTable songs={data.songs} />
            : <p className="text-muted" style={{ fontSize: 13 * scale }}>Loading…</p>}
        </Modal>
      )}
    </>
  )
}

export function SongTable({ songs }: { songs: HornSong[] }) {
  const scale = useTextScale()
  return (
    <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 13 * scale }}>
      <thead>
        <tr>
          <th className="tbl-header" style={{ textAlign: 'left' }}>Notes</th>
          <th className="tbl-header" style={{ textAlign: 'left' }}>Song Name</th>
          <th className="tbl-header" style={{ textAlign: 'left' }}>Description</th>
        </tr>
      </thead>
      <tbody>
        {songs.map((s, i) => (
          <tr key={i} className="tbl-row">
            <td className="tbl-cell" style={{ whiteSpace: 'nowrap' }}><NoteIcons notes={s.notes} /></td>
            <td className="tbl-cell" style={{ fontWeight: 600 }}>{s.name}</td>
            <td className="tbl-cell">
              <div>{s.effect}</div>
              <div className="text-muted" style={{ fontStyle: 'italic', marginTop: 2 }}>Encore: {s.encore}</div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const scale = useTextScale()
  useEffect(() => {
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }, [onClose])
  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 100,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8,
        width: '100%', maxWidth: 820, maxHeight: '85vh', overflow: 'auto', padding: 20,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <h2 style={{ margin: 0, fontSize: 18 * scale, fontWeight: 600 }}>{title}</h2>
          <button onClick={onClose} title="Close" style={{
            background: 'none', border: 'none', color: 'var(--muted)', fontSize: 20 * scale, cursor: 'pointer', lineHeight: 1,
          }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  )
}
