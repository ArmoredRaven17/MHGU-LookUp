import type { ReactNode } from 'react'
import { useTextScale } from '../theme/textScale'

const TOPICS: [string, string][] = [
  ['Monsters', "Every monster with its class and the ranks it is fought at, its hit zones (how much of each damage type each zone takes; some monsters have a second table), and its parts: how much damage staggers or breaks each, and the Kinsect extract it gives. The zone names are the community's, because the game has none."],
  ['Weapons', "Pick a weapon class in the dropdown; the list follows the upgrade tree, each weapon under the one it upgrades from. A weapon shows every level: pick a level to see its attack, affinity, element, slots, sharpness (with Handicraft +1 and +2) and the class's own details (phial, shelling, notes, Bow charge shots and coatings, bowgun ammo, rapid and crouching fire), what it costs to forge or upgrade, and what it upgrades into."],
  ['Armor', "Every armor set, Blademaster and Gunner, with each piece's slots, skill points and forge materials, the set's defense, resistances and upgrade costs, and the game's description of each piece. Search finds a set by a piece or a skill too."],
  ['Armor Skills', 'The list is the skill trees found on armor and decorations. A tree shows the skill each point total activates, the game\'s description, and a detailed explanation of what each skill actually does. Search finds a tree by its skills\' names too.'],
  ['Decorations', "Every decoration with the slots it needs, its skill points (click a skill to open its tree) and its recipes. Filter by slots, or search by a skill's name."],
  ['Hunting Styles', 'The six styles in the game\'s own words, with what each style\'s SP State does.'],
  ['Hunter Arts', 'Every Hunter Art with its tiers, and the game\'s short and full description of each tier.'],
  ['Items', 'Every item with its in-game description (decorations have their own tab).'],
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
