import type { SkillData, Style, HunterArt, WeaponClass, WeaponIndex, ArmorSet, Decoration, Item, Monster, Quest, GatherMap } from '../types'

const cache = new Map<string, Promise<unknown>>()

function load<T>(file: string): Promise<T> {
  if (!cache.has(file)) {
    const base = import.meta.env.BASE_URL.replace(/\/$/, '')
    cache.set(file, fetch(`${base}/data/${file}`).then(res => {
      if (!res.ok) throw new Error(`Failed to load ${file}: ${res.status}`)
      return res.json()
    }))
  }
  return cache.get(file) as Promise<T>
}

export const loadSkills      = () => load<SkillData>('skills.json')
export const loadStyles      = () => load<Style[]>('styles.json')
export const loadArts        = () => load<HunterArt[]>('arts.json')
export const loadWeaponIndex = () => load<WeaponIndex>('weapons.json')
export const loadWeaponClass = (id: string) => load<WeaponClass>(`weapons/${id}.json`)
export const loadArmor       = () => load<ArmorSet[]>('armor.json')
export const loadDecorations = () => load<Decoration[]>('decorations.json')
export const loadMonsters    = () => load<{ zoneTypes: string[]; classes: string[]; monsters: Monster[] }>('monsters.json')
export const loadQuests      = () => load<Quest[]>('quests.json')
export const loadGathering   = () => load<GatherMap[]>('gathering.json')
export const loadSources     = () => load<Record<string, [string, string, string, number][]>>('sources.json')
export const loadCombos      = () => load<{ a: string; b: string; result: string; rate: number; ids: [number, number, number] }[]>('combos.json')
export interface Dish {
  name: string
  ingredients: [string, string] | null
  level: number
  hunter: Record<string, number>
  palico: Record<string, number>
  menu: number
}
export type IngredientUnlock =
  | { kind: 'start' }
  | { kind: 'quest'; via: 'progress' | 'talk'; quest: number; title: string; category: string; stars: string }
  | { kind: 'request'; npc: string; items: { id: number; name: string; qty: number }[] }
  | { kind: 'talk'; npc: string }
export interface Canteen {
  ingredients: string[]
  unlocks: IngredientUnlock[][]
  dishes: Dish[]
  menus: Record<string, { sauce: string; skills: string[] }[]>
  random: { id: number; skill: string; desc: string; brief: string }[]
  alcohol: { id: number; skill: string; desc: string; brief: string }[]
  odds: { normal: number; fired: string; gourmet: number }[]
  sauces: string[]
}
export const loadCanteen     = () => load<Canteen>('canteen.json')
export const loadItems       = () => load<Item[]>('items.json')

export interface PalicoAttack { attack: number; affinity: number; element: number }
export interface PalicoWeapon {
  id: number; name: string; desc: string; rarity: number
  atkType: string; atkTree: number; style: string; spType: number; sharpness: number; melee: PalicoAttack; ranged: PalicoAttack
  elementType: string | null; defense: number; materials: [string, number][]
}
export interface PalicoArmor { id: number; name: string; desc: string; rarity: number; defense: number; res: number[]; materials: [string, number][] }
export interface PalicoSkill { id: number; name: string; desc: string; memory: number; condition: string }
export interface PalicoMove { id: number; sort: number; name: string; desc: string; gauge: number; kind: number; type: string; condition: string }
export interface Palico {
  weapons: PalicoWeapon[]; head: PalicoArmor[]; body: PalicoArmor[]; skills: PalicoSkill[]; moves: PalicoMove[]
  biases: { id: number; name: string; desc: string }[]
  labels: Record<string, string> & { res: string[] }
}
export const loadPalico = () => load<Palico>('palico.json')
