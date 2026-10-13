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
  explanation: string   // Markdown subset (paragraphs, "- " lists, pipe tables, **bold**)
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
}

export interface Decoration {
  id: number                        // its item id
  name: string
  desc: string
  slots: number
  skills: [string, number][]
  recipes: Material[][]
}
