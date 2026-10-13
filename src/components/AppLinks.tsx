import { useEffect } from 'react'
import { useTextScale } from '../theme/textScale'

// The "Other MHGU Apps" list every GU app carries (kept in step with the Set Builder's).
const APPS: [string, string, string][] = [
  ['Quest Randomizer', 'https://armoredraven17.github.io/MHGU-Quest-Randomizer/', "Rolls random quests when you can't decide what to hunt."],
  ['Collection Tracker', 'https://armoredraven17.github.io/mhgu-collection-tracker/', 'Tracks which weapons, armor and Palico gear you own, and what it costs to finish them.'],
  ['Equipment Box', 'https://armoredraven17.github.io/mhgu-equipment-box/', 'Mirrors the in-game box — 2000 hunter slots and 1000 Palico — so you can plan where things sit.'],
  ['Bingo', 'https://armoredraven17.github.io/MHGU-Bingo/', 'Builds a bingo card of hunting goals, with a shareable seed so a group can race the same board.'],
  ['Hunting Log', 'https://armoredraven17.github.io/MHGU-Hunting-Log/', 'Keeps a running record of your hunts — what you were after, what you wore, who came along.'],
  ['Zenny Gauntlet', 'https://armoredraven17.github.io/MHGU-Zenny-Gauntlet/', 'A scored challenge run — fail a hunt or get carted and you lose that weapon/style combo for the rest of the run.'],
  ['Set Builder', 'https://armoredraven17.github.io/mhgu-set-builder/', 'Assemble a full set by hand and see exactly which skills it activates.'],
  ['Weapon Trees', 'https://armoredraven17.github.io/mhgu-weapon-trees/', 'Browse every weapon upgrade tree, with full stats on any node you click.'],
  ['Challenge Run', 'https://armoredraven17.github.io/MHGU-Challenge-Run/', 'A permadeath challenge run — start from a root weapon, lose it on any quest failure, clear every Key Quest.'],
  ['Charm Farm', 'https://armoredraven17.github.io/mhgu-charm-farm/', 'A Clicker/Idle game about beating up various Brachydios until you finally get the desired God Charms you always wanted.'],
  ['Talisman Bingo', 'https://armoredraven17.github.io/mhgu-talisman-bingo/', 'A bingo card of talisman conditions — keep drawing charms until one finally fills the line you needed.'],
  ['Fishing', 'https://armoredraven17.github.io/mhgu-fishing/', 'A fishing sim on the game\'s own tables — prepare at camp, travel to a locale, come home with the catch.'],
  ['Armor Viewer', 'https://armoredraven17.github.io/mhgu-armor-viewer/', 'Renders a hunter in 3D with every armor piece swappable, so you can mix and match a set.'],
  ['Monster Viewer', 'https://armoredraven17.github.io/mhgu-monster-viewer/', 'Renders every monster in 3D with its own motion lists, so you can watch what they actually do.'],
  ['Armor Skills Explained', 'https://armoredraven17.github.io/mhgu-armor-skills-explained/', 'Every armor skill: the game\'s own description, then what it actually does, with the numbers.'],
]

export default function AppLinks({ onClose }: { onClose: () => void }) {
  const scale = useTextScale()
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.6)', zIndex: 50,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    }}>
      <div onClick={e => e.stopPropagation()} className="card" role="dialog" aria-label="Other MHGU Apps" style={{
        maxWidth: 560, width: '100%', maxHeight: '85vh', overflowY: 'auto', background: 'var(--surface)',
      }}>
        <h2 style={{ margin: '0 0 4px', fontSize: 18 * scale }}>Other MHGU Apps</h2>
        <p style={{ margin: '0 0 12px', color: 'var(--muted)', fontSize: 13 * scale }}>
          For Non-MHGU Apps, you can visit the <a href="https://armoredraven17.github.io/" target="_blank" rel="noopener">Home Page</a>
        </p>
        <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {APPS.map(([name, url, desc]) => (
            <li key={name} style={{ marginBottom: 10 }}>
              <a href={url} target="_blank" rel="noopener" style={{ fontSize: 14 * scale, fontWeight: 600 }}>{name}</a>
              <span style={{ display: 'block', color: 'var(--muted)', fontSize: 12 * scale }}>{desc}</span>
            </li>
          ))}
          <li style={{ marginBottom: 10 }}>
            <span style={{ fontSize: 14 * scale, fontWeight: 600 }}>MHGU LookUp</span>{' '}
            <span style={{ color: 'var(--accent)', fontSize: 11 * scale }}>you are here</span>
            <span style={{ display: 'block', color: 'var(--muted)', fontSize: 12 * scale }}>
              Look up weapons, armor skills, Hunting Styles, Hunter Arts and items, all read from the game.
            </span>
          </li>
        </ul>
        <div style={{ textAlign: 'right' }}>
          <button onClick={onClose} style={{
            background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 4,
            color: 'var(--text)', padding: '6px 14px', fontSize: 13 * scale, cursor: 'pointer',
          }}>Close</button>
        </div>
      </div>
    </div>
  )
}
