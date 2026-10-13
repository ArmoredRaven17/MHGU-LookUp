import type { SkillData, Style, HunterArt, WeaponClass, Item } from '../types'

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

export const loadSkills  = () => load<SkillData>('skills.json')
export const loadStyles  = () => load<Style[]>('styles.json')
export const loadArts    = () => load<HunterArt[]>('arts.json')
export const loadWeapons = () => load<WeaponClass[]>('weapons.json')
export const loadItems   = () => load<Item[]>('items.json')
