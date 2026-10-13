import type { ReactNode } from 'react'
import { useTextScale } from '../theme/textScale'

const TOPICS: [string, string][] = [
  ['Weapons', 'Pick a weapon class in the dropdown, then a weapon. Each shows its rarity, element and the class\'s own details (phial, shelling, notes, charge levels), and every name the weapon takes as it is upgraded, with the game\'s description of each.'],
  ['Armor Skills', 'The list is the skill trees found on armor and decorations. A tree shows the skill each point total activates, the game\'s description, and a detailed explanation of what each skill actually does. Search finds a tree by its skills\' names too.'],
  ['Hunting Styles', 'The six styles in the game\'s own words, with what each style\'s SP State does.'],
  ['Hunter Arts', 'Every Hunter Art with its tiers, and the game\'s short and full description of each tier.'],
  ['Items', 'Every item with its in-game description.'],
  ['Bookmarks and Notes', 'The bookmark button beside a title saves the page to Bookmarks. The Notes box at the bottom of a page keeps your own notes; the Notes tab lists them all. Both stay on this device.'],
  ['The list panel', 'Drag the bar beside the list to make it wider or narrower; click it to hide the list.'],
  ['Coming soon', 'Tabs marked as coming soon have not been read from the game yet.'],
]

export default function HelpPage() {
  const scale = useTextScale()
  const H = ({ children }: { children: ReactNode }) => <h2 style={{ margin: '16px 0 4px', fontSize: 15 * scale, fontWeight: 600, color: 'var(--accent)' }}>{children}</h2>
  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
      <div style={{ maxWidth: 720 }}>
        <h1 style={{ margin: 0, fontSize: 22 * scale, fontWeight: 700 }}>Help</h1>
        {TOPICS.map(([t, body]) => (
          <div key={t}>
            <H>{t}</H>
            <p style={{ margin: 0, fontSize: 14 * scale, lineHeight: 1.6 }}>{body}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
