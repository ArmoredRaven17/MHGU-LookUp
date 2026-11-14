import { useEffect, useMemo, useState } from 'react'
import { BASE } from '../utils/assets'

// Item icons read from the game (tools/build_icons.py): the icon sheet's shape tinted by the item's colour.
// item-icons.json maps an item id, and an item name, to its icon file.
interface IconMap { byId: Record<string, string>; byName: Record<string, string> }

let cache: Promise<IconMap> | null = null
const load = () => (cache ??= fetch(`${BASE}/data/item-icons.json`).then(r => r.json()))

export interface ItemIcons {
  byId: (id: number) => string | undefined
  byName: (name: string) => string | undefined
}

const url = (key: string | undefined) => key ? `${BASE}/icons/item/${key}.png` : undefined

// Monster icons read from the game (tools/build_icons.py), one per Monsters-tab id that the game's table names.
let monsterCache: Promise<Record<string, string>> | null = null
export function useMonsterIcons(): (id: string) => string | undefined {
  const [map, setMap] = useState<Record<string, string> | null>(null)
  useEffect(() => { (monsterCache ??= fetch(`${BASE}/data/monster-icons.json`).then(r => r.json())).then(setMap) }, [])
  return useMemo(() => (id: string) => map?.[id] ? `${BASE}/icons/monster/${map[id]}.png` : undefined, [map])
}

export function useItemIcons(): ItemIcons {
  const [map, setMap] = useState<IconMap | null>(null)
  useEffect(() => { load().then(setMap) }, [])
  return useMemo(() => ({
    byId: (id: number) => url(map?.byId[String(id)]),
    byName: (name: string) => url(map?.byName[name]),
  }), [map])
}
