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
  unlock: ArtUnlock[]               // the ways the game teaches it, any one (tools/build_arts_unlocks.py)
}

export interface QuestRef { quest: number; title: string; category: string; stars: string }
export type ArtUnlock =
  | { kind: 'start' }
  | ({ kind: 'quest' } & QuestRef)
  | { kind: 'quests'; quests: QuestRef[] }                                   // every one of them
  | { kind: 'progress'; village?: string; hr?: number; hub?: string }       // Village N★ Quests open, or HR N / G1★
  | { kind: 'requests'; village: string; count: number }
  | { kind: 'contribution'; village: string; points: number }
  | { kind: 'hunt'; monsters: { id: string; name: string }[] }
  | { kind: 'palico'; level: number }

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
  bow?: { arc: string; open: number; shots: string[]; coatings: string[]; boost?: string[] }   // boost: coatings the bow boosts
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
  listClass?: string                // listed under this class's heading instead (the viewer's listAfter)
  hz?: HitZones
  rewards?: Record<string, MonsterRewards>   // per rank (Low Rank, High Rank, G Rank): tools/build_rewards.py
}

export type RewardRow = [number, string, number, number]        // item id, item name, quantity, percent
// Every list the ROM has (tools/build_rewards.py). band: a Deviant's level band (the quest's boss mEmSubType % 3);
// slot: the rHagi slot of a shiny drop / gathered list (some monsters have several, picked by their own code).
export interface BandList { band: number; rows: RewardRow[] }
export interface SlotList { slot: number; rows: RewardRow[] }
export interface BreakList { n: number; band: number; name: string | null; rows: RewardRow[] }
export interface MonsterRewards {
  carve?: BandList[]; tail?: BandList[]; mine?: BandList[]; capture?: BandList[]
  shiny?: SlotList[]; gather?: SlotList[]
  break?: BreakList[]                       // named by the break's parts as the Parts table names them
}

// A monster's hit zones, one table (tools/build_hitzones.py): each zone, then the rows a state or a part puts on it
// ("Chest", "Chest (Broken)"), named with the Monster Viewer's words.
export type ZoneRow = Record<string, number>          // one damage-table row, keyed by zone type
export interface HitZones {
  zones: { name: string; row: ZoneRow }[]
  parts: { name: string; stagger: number; break: number | null; extract: string }[]
}

export interface Quest {
  id: number
  title: string
  client: string
  desc: string
  others: string          // the quest text's other monsters
  objective: string
  target: { monster: string } | { item: number } | null   // the main target (its icon): tools/build_quests.py
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
