// Gunner colour coding (Raven, 2026-11-14: "Use MHFU's colors, but we will need to add some added colors since the
// game added things"). The MHFU LookUp's palette (MHFU App - Beta, WeaponViewModel.cs: ChargeBrush, CoatingDefs,
// AmmoColors, AmmoBrush) for every kind it had; the kinds GU added take the colours marked GU below.

// Bow charge shots: MHFU's hue per type, paler at Lv1 and stronger at Lv5 (the other channels step 200 -> 88).
// Heavy is GU's: purple (Raven).
export function shotColor(shot: string): string | undefined {
  const m = /^(\w+) Lv(\d)/.exec(shot)
  if (!m) return undefined
  const off = Math.round(200 + (88 - 200) * (Math.min(5, Math.max(1, +m[2])) - 1) / 4)
  const rgb: Record<string, [number, number, number]> = {
    Rapid: [off, off, 255], Spread: [off, 255, off], Pierce: [255, off, off],
    Heavy: [Math.min(255, off + 60), off, 255],                         // GU: purple
  }
  const c = rgb[m[1]]
  return c ? `rgb(${c.join(',')})` : undefined
}

// Coatings (MHFU CoatingDefs; Elem / Exhaust / Blast are GU's).
const COATING: [RegExp, string][] = [
  [/^Power/, '#FF5252'], [/^Poison/, '#B060E0'], [/^Para/, '#F5C400'], [/^Sleep/, '#7FD8F0'],
  [/^C\.Range/, '#FFFFFF'], [/^Paint/, '#FF7FBF'],
  [/^Elem/, '#FF8C42'],      // GU: orange
  [/^Exhaust/, '#A3AEE0'],   // GU: slate blue
  [/^Blast/, '#ADD56D'],     // GU: lime, the game's own Blast icon colour
]
export function coatingColor(name: string): string | undefined {
  return COATING.find(([re]) => re.test(name))?.[1]
}

// Ammo (MHFU AmmoBrush / AmmoColors; a piercing element shot takes its element's colour; the rest are GU's).
const AMMO: [RegExp, string][] = [
  [/^Normal/, '#6A9CFF'], [/^Pellet/, '#66CC66'], [/^Pierce/, '#FF6A6A'],
  [/^Crag/, '#1FC8B4'], [/^Clust/, '#7B68EE'],
  [/^(P\.)?Flaming/, '#FF4D2E'], [/^(P\.)?Water/, '#4A9EFF'], [/^(P\.)?Thunder/, '#F5C400'],
  [/^(P\.)?Freeze/, '#7FD8F0'], [/^Dragon/, '#B060E0'],
  [/^Poison/, '#B060E0'], [/^Para/, '#F5C400'], [/^Sleep/, '#7FD8F0'],
  [/^(Group )?Recover/, '#5FB85F'], [/^Paint/, '#FF7FBF'], [/^Tranq/, '#FF5252'],
  [/^Demon Armor|^Super Armor|^Armor/, '#FFA040'], [/^Demon/, '#FF5252'],
  [/^Exhaust/, '#A3AEE0'],   // GU: as Exhaust Coating
  [/^Blast/, '#ADD56D'],     // GU: as Blast Coating
  [/^Slicing/, '#E6B85C'],   // GU: gold
  [/^Remedy/, '#5FB85F'],    // GU: a recovery shot, Recover's green
  [/^Dung/, '#B08850'],      // GU: brown
  [/^Flash|^Dazzling/, '#FFFFFF'],  // GU: white
]
export function ammoColor(name: string): string | undefined {
  return AMMO.find(([re]) => re.test(name))?.[1]
}
