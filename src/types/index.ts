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

export interface WeaponForm {
  name: string
  text: string
}

export interface Weapon {
  row: number
  name: string
  forms: WeaponForm[]
  rarity: number
  forge: boolean
  element?: string
  phial?: string
  shell?: { type: string; level: number }
  notes?: string[]
  charges?: number
}

export interface WeaponClass {
  id: string
  name: string
  weapons: Weapon[]
}

export interface Item {
  id: number
  name: string
  desc: string
}
