import { useTextScale } from '../theme/textScale'

// A tab whose data has not been read from the ROM yet.
export default function PlaceholderPage({ label }: { label: string }) {
  const scale = useTextScale()
  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ margin: '0 0 6px', fontSize: 22 * scale, fontWeight: 700 }}>{label}</h1>
      <p className="text-muted" style={{ fontSize: 14 * scale }}>
        Coming soon — this tab is filled once its data has been read from the game.
      </p>
    </div>
  )
}
