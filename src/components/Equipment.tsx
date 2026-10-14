import type { Material } from '../types'
import { useTextScale } from '../theme/textScale'

// Sharpness colours, in the table's order (red .. purple).
export const SHARP_COLOURS = ['#d22b2b', '#e8822a', '#e8d22a', '#5cc23a', '#3a7fe0', '#f2f2f2', '#b05ad8']
export const SHARP_NAMES = ['Red', 'Orange', 'Yellow', 'Green', 'Blue', 'White', 'Purple']

/** One sharpness gauge: the table row (where each colour ends) cut at `length`. */
export function SharpnessBar({ row, length, max }: { row: number[]; length: number; max: number }) {
  const scale = useTextScale()
  const segs: number[] = []
  let prev = 0
  for (const end of row) {
    const e = Math.min(end, length)
    segs.push(Math.max(0, e - prev))
    prev = Math.max(prev, e)
  }
  return (
    <div title={segs.map((s, i) => s ? `${SHARP_NAMES[i]} ${s}` : '').filter(Boolean).join(' · ')}
         style={{ display: 'flex', width: 200 * scale, height: 10, background: 'rgba(0,0,0,0.5)', border: '1px solid var(--border)' }}>
      {segs.map((s, i) => s > 0 && <div key={i} style={{ width: `${(s / max) * 100}%`, background: SHARP_COLOURS[i] }} />)}
    </div>
  )
}

/** A material list: "Iron Ore ×3", or "Ore (Low Rank) 4 pts" for a material-point cost. */
export function Materials({ mats }: { mats: Material[] }) {
  const scale = useTextScale()
  if (!mats.length) return <span className="text-muted">—</span>
  return (
    <span style={{ fontSize: 13 * scale }}>
      {mats.map((m, i) => (
        <span key={i} style={{ whiteSpace: 'nowrap' }}>
          {i > 0 && ', '}
          {m.length === 3 ? <>{m[0]} materials <span className="text-muted">{m[1]} pts</span></> : <>{m[0]} <span className="text-muted">×{m[1]}</span></>}
        </span>
      ))}
    </span>
  )
}

export function SlotsText({ n }: { n: number }) {
  return <span style={{ letterSpacing: 2 }}>{'◯'.repeat(n) + '—'.repeat(Math.max(0, 3 - n))}</span>
}
