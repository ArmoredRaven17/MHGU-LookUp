import type { ReactNode } from 'react'
import { useItemIcons } from '../data/icons'
import { useTextScale } from '../theme/textScale'

/** An item's name with its in-game icon before it (by id when known, else by name). */
export default function ItemName({ name, id, children }: { name: string; id?: number; children?: ReactNode }) {
  const icons = useItemIcons()
  const scale = useTextScale()
  const src = (id != null ? icons.byId(id) : undefined) ?? icons.byName(name)
  return (
    <span style={{ whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: 3, verticalAlign: 'middle' }}>
      {src && <img src={src} alt="" width={18 * scale} height={18 * scale} style={{ imageRendering: 'pixelated' }} />}
      {children ?? name}
    </span>
  )
}
