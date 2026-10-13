import { useState } from 'react'
import Dropdown from '../components/Dropdown'
import { COLOR_PRESETS, getSurface, getAccent, setSurface, setAccent, resetAppearance } from '../theme/appearance'
import { SCALE_PRESETS, getTextScale, setTextScale, resetTextScale, useTextScale } from '../theme/textScale'

export default function SettingsPage() {
  const scale = useTextScale()
  const [surface, setSurfaceState] = useState(getSurface())
  const [accent, setAccentState] = useState(getAccent())
  const [textScale, setTextScaleState] = useState(getTextScale())

  const chooseSurface = (key: string) => { setSurface(key); setSurfaceState(key) }
  const chooseAccent = (hex: string) => { setAccent(hex); setAccentState(hex) }
  const chooseTextScale = (value: number) => { setTextScale(value); setTextScaleState(value) }
  const restore = () => {
    resetAppearance(); resetTextScale()
    setSurfaceState(getSurface()); setAccentState(getAccent()); setTextScaleState(getTextScale())
  }

  const accentSelectValue = (COLOR_PRESETS.find(p => p.swatch.toLowerCase() === accent.toLowerCase()) ?? COLOR_PRESETS[0]).swatch
  const surfaceOptions = COLOR_PRESETS.map(p => ({ value: p.key, label: p.name, swatch: p.swatch }))
  const accentOptions = COLOR_PRESETS.map(p => ({ value: p.swatch, label: p.name, swatch: p.swatch }))

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: 24, paddingBottom: 300 }}>
      <div style={{ maxWidth: 720 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h1 style={{ margin: 0, fontSize: 22 * scale, fontWeight: 700 }}>Settings</h1>
          <button onClick={restore} style={{
            background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 4,
            color: 'var(--text)', padding: '6px 12px', fontSize: 13 * scale, cursor: 'pointer',
          }}>Restore Defaults</button>
        </div>

        <SectionTitle>Appearance</SectionTitle>

        <Label>Text size</Label>
        <Dropdown value={String(textScale)} onChange={v => chooseTextScale(Number(v))}
          options={SCALE_PRESETS.map(p => ({ value: String(p.value), label: p.label }))} />
        <Hint>Grows text only — not a page zoom, so the layout stays put.</Hint>

        <Label style={{ marginTop: 16 }}>App colour (background theme)</Label>
        <div style={{ marginBottom: 12 }}>
          <Dropdown value={surface} onChange={chooseSurface} options={surfaceOptions} />
        </div>

        <Label>Accent colour (highlights)</Label>
        <div style={{ marginBottom: 4 }}>
          <Dropdown value={accentSelectValue} onChange={chooseAccent} options={accentOptions} />
        </div>
        <Hint>Colour and accent apply immediately and are remembered on this device.</Hint>
      </div>
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  const scale = useTextScale()
  return <h2 style={{ margin: '0 0 8px', fontSize: 16 * scale, fontWeight: 600 }}>{children}</h2>
}
function Label({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  const scale = useTextScale()
  return <p style={{ margin: '0 0 6px', fontSize: 13 * scale, ...style }}>{children}</p>
}
function Hint({ children }: { children: React.ReactNode }) {
  const scale = useTextScale()
  return <p style={{ margin: '2px 0 0', fontSize: 12 * scale, fontStyle: 'italic', color: 'var(--muted)' }}>{children}</p>
}
