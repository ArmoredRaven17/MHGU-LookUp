// Shapes of the files in public/data/, written by tools/build_data.py from the MHGU ROM.

export interface SkillTree {
  id: number
  name: string
  desc: string
  ladder: { points: number; skill: number }[]
}

export interface Skill {
  id: number
  name: string
  desc: string
  trees: { tree: number; points: number }[]
  brief: string         // a short explanation; the full one is in MHGU Armor Skills Explained
  grantedBy: string[]
}

export interface SkillData {
  trees: SkillTree[]
  skills: Skill[]
}

export interface Style {
  key: string
  name: string
  short: string
  full: string
  sp: string
}

export interface HunterArt {
  id: number
  name: string
  short: string
  full: string
  category: number                  // mArtsCategory: groups an Art's tiers; 1..10 the generic Arts
  weapon: string | null             // weapon class (w00..w14), null for a generic Art
}

// A material: [name, quantity], or [category name, points, 'pts'] for a material-point cost.
export type Material = [string, number] | [string, number, 'pts']

export interface WeaponForm {
  name: string
  text: string
  from: number        // the level this name starts at
}

export interface WeaponLevel {
  lv: number
  raw: number
  aff: number
  defense: number
  slots: number
  ele?: number
  ele2?: number
  sharp?: [number, number]          // [row of the sharpness table, gauge length at Handicraft +0]
  phialValue?: number
  shellLv?: number
  notes?: string[]
  bow?: { arc: string; open: number; shots: string[]; coatings: string[] }
  gun?: {
    reload: string; recoil: string; deviation: string
    ammo: [string, number][]
    internal: [string, number, number][]   // ammo, total, clip
    crouch?: [string, number][]            // Heavy Bowgun: ammo, capacity
    rapid?: [string, number, number, string][]  // Light Bowgun: ammo, shots, power %, wait
  }
  cost?: Material[]                 // to reach this level (level 1: upgrading into the weapon)
}

export interface Weapon {
  row: number
  name: string
  forms: WeaponForm[]
  rarity: number
  depth: number                     // in the upgrade tree
  element?: string
  element2?: string
  phial?: string
  shelling?: string
  create?: { level: number; mats: Material[] }[]
  from?: { row: number; level: number }
  into: { row: number; level: number }[]
  levels: WeaponLevel[]
}

export interface WeaponClass {
  id: string
  name: string
  weapons: Weapon[]
}

export interface WeaponIndex {
  classes: { id: string; name: string; count: number }[]
  sharpness: number[][]             // 7 cumulative colour ends per row: red .. purple
}

export interface ArmorPiece {
  slot: string
  name: string
  desc: string
  slots: number
  skills: [string, number][]
  create?: Material[]
}

export interface ArmorSet {
  id: number
  name: string
  rarity: number
  sort: number                      // the game's own listing order (mSortID); armor.json comes sorted by it
  event: boolean                    // listed after the last RARE 11 set: the event sets
  class: 'Blademaster' | 'Gunner' | 'Both'
  gender: 'Male' | 'Female' | 'Both'
  zenny: number
  res: number[]                     // fire, water, thunder, ice, dragon
  defense: number[]                 // per level
  pieces: ArmorPiece[]
  upgrades: Material[][]            // the cost of level 2, 3, ...
}

export interface Item {
  id: number
  name: string
  desc: string
  carry: number
  category: string
  buy?: number          // only for an item the shop sells
  sell: number
}

export interface Decoration {
  id: number                        // its item id
  name: string
  desc: string
  slots: number
  skills: [string, number][]
  recipes: Material[][]
}

export interface Monster {
  id: string
  name: string
  small: boolean
  class: string
  quests: [string, number][]        // [rank, how many quests have it at that rank]
  hz?: HitZones
}

// A monster's hit zones as the Monster Viewer's Hit Zones panel shows them (tools/build_hitzones.py).
export type ZoneRow = Record<string, number>          // one damage-table row, keyed by zone type
export interface ZoneRule {                           // render/monster.js ROM_MEAT_SWITCH: slot takes table-1 row `row` when it holds
  slot: number; row: number
  rung?: number[]; ladder?: number[]; mode?: number[]; ctl?: number[]; rage?: boolean
  broken?: string | string[]; intact?: string | string[]; heat?: string
}
export interface HitZones {
  rows: { slot: number; name: string }[]              // the chart's rows, in slot order
  tables: ZoneRow[][]                                 // the .dtt: table 0 per slot, then the second block (a pool of rows)
  arm?: { rows: { slot: number; name: string }[]; table: ZoneRow[] }
  state?: { axis: 'table' | 'mode' | 'level' | 'rage' | 'ctl' | 'ladder'; names: string[]; values?: number[]; rage?: boolean[] | null }
  rules?: ZoneRule[]
  switches?: { key: string; name: string; section: string }[]
  heat?: { beam: string[] }
  parts: { name: string; stagger: number; break: number | null; extract: string }[]
}

export interface Quest {
  id: number
  title: string
  client: string
  desc: string
  others: string          // the quest text's other monsters
  objective: string
  failure: string
  subquest: string
  category: string        // Village, Hub, Arena, Event, Special Permit, Training
  stars: string           // '3★', 'G2★', 'Permit Lv 4'
  level: number
  rank: string
  key: boolean
  order: number           // the quest boards' order
  locale: string
  time: number            // minutes
  fee: number
  reward: number
  hrp: number
  subReward: number
  subHrp: number
  requirements: string[]
  monsters: [string, string][]   // [monster id, name]
}

export type GatherItem = [string, number, number]   // item, quantity, percent per pull

export interface GatherPoint {
  kind: string                     // Gathering, Ore Mining, Insect Catching
  items?: GatherItem[]             // a fixed point
  random?: boolean                 // a random point: one of its outcomes is rolled
  outcomes?: { chance: number; items: GatherItem[] }[]
}

export interface GatherMap {
  map: number
  name: string
  ranks: { rank: string; areas: { area: number; name: string; points: GatherPoint[] }[] }[]
}
