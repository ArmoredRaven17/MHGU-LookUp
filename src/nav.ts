// The tabs, in nav order. A tab marked `soon` has not been read from the game yet.
export interface NavItem {
  path: string
  label: string
  soon?: boolean   // not read from the game yet
}

export const NAV: NavItem[] = [
  { path: 'bookmarks',   label: 'Bookmarks' },
  { path: 'notes',       label: 'Notes' },
  { path: 'monsters',    label: 'Monsters', soon: true },
  { path: 'weapons',     label: 'Weapons' },
  { path: 'armor',       label: 'Armor' },
  { path: 'armorskills', label: 'Armor Skills' },
  { path: 'decorations', label: 'Decorations', soon: true },
  { path: 'styles',      label: 'Hunting Styles' },
  { path: 'arts',        label: 'Hunter Arts' },
  { path: 'quests',      label: 'Quests', soon: true },
  { path: 'gathering',   label: 'Gathering', soon: true },
  { path: 'items',       label: 'Items' },
  { path: 'combos',      label: 'Combo List', soon: true },
  { path: 'kitchen',     label: 'Kitchen', soon: true },
  { path: 'palico',      label: 'Palico', soon: true },
  { path: 'settings',    label: 'Settings' },
  { path: 'help',        label: 'Help' },
  { path: 'about',       label: 'About' },
]

// Display order and header per entity type.
export const ENTITY_SECTIONS: { type: string; header: string }[] = [
  { type: 'weapon',     header: 'Weapons' },
  { type: 'armor',      header: 'Armor' },
  { type: 'armorskill', header: 'Armor Skills' },
  { type: 'art',        header: 'Hunter Arts' },
  { type: 'item',       header: 'Items' },
]

