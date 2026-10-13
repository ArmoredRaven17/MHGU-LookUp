import { useEffect, useState } from 'react'
import { loadStyles } from '../data/loaders'
import type { Style } from '../types'
import GameText from '../components/GameText'
import { useTextScale } from '../theme/textScale'

export default function StylesPage() {
  const scale = useTextScale()
  const [styles, setStyles] = useState<Style[]>([])
  useEffect(() => { loadStyles().then(setStyles) }, [])

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
      <div style={{ maxWidth: 760 }}>
        <h1 style={{ margin: '0 0 4px', fontSize: 22 * scale, fontWeight: 700 }}>Hunting Styles</h1>
        <p style={{ margin: '0 0 16px', color: 'var(--muted)', fontSize: 13 * scale }}>
          Each style in the game's own words: the style select's summary and description, then its SP State.
        </p>
        {styles.map(s => (
          <div key={s.key} className="card" style={{ marginBottom: 14 }}>
            <h2 style={{ margin: '0 0 4px', fontSize: 18 * scale, color: 'var(--accent)' }}>{s.name}</h2>
            <GameText text={s.short} style={{ margin: '0 0 10px', color: 'var(--muted)', fontStyle: 'italic', fontSize: 13 * scale }} />
            <GameText text={s.full} style={{ margin: '0 0 10px', fontSize: 14 * scale }} />
            <h3 style={{ margin: '0 0 4px', fontSize: 12 * scale, textTransform: 'uppercase', letterSpacing: '0.05em' }}>SP State</h3>
            <GameText text={s.sp} style={{ margin: 0, fontSize: 13 * scale }} />
          </div>
        ))}
      </div>
    </div>
  )
}
