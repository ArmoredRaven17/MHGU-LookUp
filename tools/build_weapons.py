"""Weapons, read from the ROM: public/data/weapons.json (the classes and the sharpness table) and
public/data/weapons/wNN.json (every weapon of a class, level by level). Called by build_data.py.

Every column below was LOCATED against the Collection Tracker's per-level files (docs/data/stats and
docs/data/materials, Kiranico / mhgu.db derived): a column is used only where it reproduced the tracker on
every row, and the count is given. Where the ROM and the tracker disagree, the ROM is used (noted).
`python tools/check_weapons.py` re-runs every comparison.

table/weaponNNBaseData (one row per weapon; 32 bytes for the bowguns, 33 or 34 for the rest)
  +0  u32 the weapon's row          +9  the level its second name starts at (every weapon; the third
  +11 rarity - 1                        name is the final level's: the Ultimate form)
  +17 element type: 0 none, 1 Fire, 2 Water, 3 Thunder, 4 Dragon, 5 Ice, 6 Poison, 7 Paralysis,
      8 Sleep, 9 Blast (every level row of every class but the bowguns, which have no element)
  +18 Dual Blades: the second element's type (844/844); Switch Axe phial 0 Power, 1 Element,
      2 Paralysis, 3 Dragon, 4 Exhaust, 5 Poison; Charge Blade phial 0 Impact, 1 Element;
      Gunlance shelling 0 Normal, 1 Wide, 2 Long
  last 10 bytes: up to five [level, row] = the weapons this one upgrades into, and at which level
      (every parent link of every class)
table/weaponNNLevelData (one row per level)
  +0 u32 id, +4 the weapon's row, +5 the level
  melee (15/16/17 bytes): +6 sharpness row, +7 sharpness start, u16 +8 attack, +10 defense,
      s8 +11 affinity, +12 element value, +14 second element value (Dual Blades) / phial value
      (Switch Axe) / shelling level - 1 (Gunlance) / note set (Hunting Horn), slots at the last byte
  Bow (31): u16 +6 attack, +8 defense, s8 +9 affinity, +10 element value, +12 slots, +13 arc shot,
      +14 charge levels open, +15..+18 the four charge shots, +19..+28 the coatings (1 usable, 2 boosted)
  bowguns (100): u16 +6 attack, +8 defense, s8 +9 affinity, +10 slots, +11 deviation, +12 reload,
      +13 recoil, +14..+18 rows of squatshotData (Heavy: Crouching Fire) or rapidshotData (Light:
      Rapid Fire), +19 five [ammo, total, clip] (Internal Ammo), +34 33 x [capacity, usable] in ammo order
  Affinity: 3 rows per class differ from the tracker (e.g. Licht/Ombre: ROM 20, tracker 0).
Sharpness: table/kireajiData.kad, 7 u16 per row = where each colour ends (red .. purple). A weapon's
  gauge is the row cut at 150 + 25 x (+7), and each Handicraft level adds 25 up to the row's end
  (8755 of 8755 melee levels; the rule is fitted to the tracker, the code that applies it is not read).
Materials: table/weaponCreateWNN (forge recipes; +0 the level the weapon is forged at -- a weapon can
  have several, e.g. Hunter's Knife at 1 and 8 --, +2 the row, +6 five [u16 item, qty, flag]; the flag
  and +4 are not read and left out) and table/weaponProcessWNN (+0 the row, +2 the level, +4 four [u16 item, qty],
  +16 u16 material-point category, +18 u16 points; level 1 = the cost of upgrading into the weapon).
Names: eng/table/weaponNNMsgData_eng.gmd (6 strings per row: three names, each with its text);
  item names eng/table/itemData_eng.gmd; ammo order and ammo -> item: rodata 0x16218b4 ([u16 item,
  u16 ammo] pairs, the game's own table); the screen text eng/table/StartMenuMsg_eng.gmd: recoil 284 +
  code, reload 304 - code, deviation 317 - code (0 = '-'), arc shots 348..350, charge shots 355..369
  (Rapid/Spread/Pierce Lv1-5) and 427..431 (Heavy Lv1-5), phials 399..401; coatings are items
  208..217 in byte order. Rapid Fire's wait (0..3) is shown S/M/L/XL: located, not found as text.
Hunting Horn notes: LevelData +14 -> table/fueMusicData.fmt (3 notes per set); the colour names are the
  Armor Viewer's (docs/weapons/w12.json source).
"""
import struct

CLASSES = [('00', 'Great Sword'), ('07', 'Long Sword'), ('01', 'Sword & Shield'), ('11', 'Dual Blades'),
           ('02', 'Hammer'), ('12', 'Hunting Horn'), ('03', 'Lance'), ('09', 'Gunlance'), ('08', 'Switch Axe'),
           ('14', 'Charge Blade'), ('13', 'Insect Glaive'), ('06', 'Light Bowgun'), ('04', 'Heavy Bowgun'),
           ('10', 'Bow')]
ELEMENT = [None, 'Fire', 'Water', 'Thunder', 'Dragon', 'Ice', 'Poison', 'Paralysis', 'Sleep', 'Blast']
SA_PHIAL = ['Power', 'Element', 'Paralysis', 'Dragon', 'Exhaust', 'Poison']
CB_PHIAL = ['Impact', 'Element']
SHELL = ['Normal', 'Wide', 'Long']
NOTE = [None, 'White', 'Purple', 'Red', 'Blue', 'Green', 'Yellow', 'Sky Blue', 'Orange']
WAIT = ['S', 'M', 'L', 'XL']
NONE = 0x4a                          # an empty ammo / crouch / rapid slot


def u16(r, o):
    return struct.unpack_from('<H', r, o)[0]


def s8(v):
    return v - 256 if v > 127 else v


def build(gmd, rows, write, item, cat):
    menu = gmd('StartMenuMsg_eng.gmd')
    ro = open('C:/MHGU-ROM/exefs/main.rodata', 'rb').read()
    ammo = {}                                          # ammo number -> name
    for i in range(80):
        it, kind = struct.unpack_from('<HH', ro, 0x16218b4 - 0x13EF000 + 4 * i)
        if not it:
            break
        ammo.setdefault(kind, item[it])
    squat = [(r[0], r[1]) for r in rows('squatshotData.squs', 2)]
    rapid = [tuple(r) for r in rows('rapidshotData.raps', 4)]
    music = [list(r) for r in rows('fueMusicData.fmt', 3)]
    shots = {i: menu[354 + i] for i in range(1, 16)} | {i: menu[411 + i] for i in range(16, 21)}
    coatings = [item[i] for i in range(208, 218)]
    sharp = [list(struct.unpack_from('<7H', r, 0)) for r in rows('kireajiData.kad', 14)]

    def mats(pairs):
        return [[item[i], q] for i, q in pairs if i]

    index = []
    for c, label in CLASSES:
        msg = gmd(f'weapon{c}MsgData_eng.gmd')
        base_rows = rows(f'weapon{c}BaseData.w{c}d', {'04': 32, '06': 32}.get(c, 33 if c in ('00', '01', '02', '03', '07', '10', '12') else 34))
        level_rows = rows(f'weapon{c}LevelData.w{c}d', {'04': 100, '06': 100, '10': 31, '09': 16, '12': 16, '08': 17, '11': 17, '14': 17}.get(c, 15))
        create = rows(f'weaponCreateW{c}.wcd', 38)
        process = rows(f'weaponProcessW{c}.wpd', 32)

        base = {struct.unpack_from('<I', b, 0)[0]: b for b in base_rows}
        levels = {}
        for r in level_rows:
            levels.setdefault(r[4], {})[r[5]] = r
        cost = {(u16(p, 0), u16(p, 2)): p for p in process}
        forge = {}                                     # row -> (first position in the forge list, [recipes])
        for i, r in enumerate(create):
            forge.setdefault(u16(r, 2), (i, []))[1].append(r)
        parent = {}
        for row, b in base.items():
            for k in range(5):
                lv, child = b[len(b) - 10 + 2 * k], b[len(b) - 9 + 2 * k]
                if child:
                    parent[child] = (row, lv)

        weapons = {}
        for row, b in base.items():
            if row not in levels or msg[6 * row] in ('', '@', 'DUMMY', '(None)'):
                continue                                   # unused rows: the ROM names them DUMMY or (None)
            lvs = levels[row]
            top = max(lvs)
            names = [msg[6 * row + 2 * k] for k in range(3)]
            texts = [msg[6 * row + 2 * k + 1] for k in range(3)]
            starts = [1, b[9], top]
            forms = []
            for k in range(3):
                if names[k] not in ('', '@', 'DUMMY', '(None)') and (k == 0 or names[k] != forms[-1]['name']):
                    forms.append({'name': names[k], 'text': texts[k], 'from': starts[k]})
            w = {'row': row, 'name': names[0], 'forms': forms, 'rarity': b[11] + 1}
            if b[17] and c not in ('04', '06'):           # the bowguns' +17 is something else
                w['element'] = ELEMENT[b[17]]
            if c == '11' and b[18]:
                w['element2'] = ELEMENT[b[18]]
            if c == '08':
                w['phial'] = SA_PHIAL[b[18]]
            if c == '14':
                w['phial'] = CB_PHIAL[b[18]]
            if c == '09':
                w['shelling'] = SHELL[b[18]]
            if row in forge:
                w['create'] = [{'level': u16(r, 0), 'mats': mats((u16(r, o), r[o + 2]) for o in range(6, 26, 4))}
                               for r in sorted(forge[row][1], key=lambda r: u16(r, 0))]
            if row in parent:
                w['from'] = {'row': parent[row][0], 'level': parent[row][1]}
            w['into'] = [{'row': b[len(b) - 9 + 2 * k], 'level': b[len(b) - 10 + 2 * k]}
                         for k in range(5) if b[len(b) - 9 + 2 * k]]

            out = []
            for lv in sorted(lvs):
                r = lvs[lv]
                e = {'lv': lv}
                if c in ('04', '06', '10'):
                    e.update(raw=u16(r, 6), defense=r[8], aff=s8(r[9]))
                else:
                    e.update(raw=u16(r, 8), defense=r[10], aff=s8(r[11]))
                    e['sharp'] = [r[6], 150 + 25 * r[7]]
                    e['slots'] = r[-1]
                    if 'element' in w:
                        e['ele'] = r[12]
                    if c == '11' and b[18]:
                        e['ele2'] = r[14]
                    if c == '08' and b[18] not in (0, 1):
                        e['phialValue'] = r[14]
                    if c == '09':
                        e['shellLv'] = r[14] + 1
                    if c == '12':
                        e['notes'] = [NOTE[n] for n in music[r[14]]]
                if c == '10':
                    if 'element' in w:
                        e['ele'] = r[10]
                    e['slots'] = r[12]
                    e['bow'] = {'arc': menu[348 + r[13]], 'open': r[14],
                                'shots': [shots[x] for x in r[15:19] if x],
                                'coatings': [coatings[k] for k in range(10) if r[19 + k]]}
                    # a coating byte of 2 is a boost: it occurs only on the four coatings the game can boost
                    # (C.Range, Poison, Para, Sleep; StartMenuMsg 379 'Coating Boosts'). The code that reads it is not traced.
                    boost = [coatings[k] for k in range(10) if r[19 + k] == 2]
                    if boost:
                        e['bow']['boost'] = boost
                if c in ('04', '06'):
                    e['slots'] = r[10]
                    g = {'deviation': menu[317 - r[11]], 'reload': menu[304 - r[12]], 'recoil': menu[284 + r[13]],
                         'ammo': [[ammo[k], r[34 + 2 * k]] for k in range(33) if r[35 + 2 * k] and k in ammo],
                         'internal': [[ammo[r[o]], r[o + 1], r[o + 2]] for o in range(19, 34, 3) if r[o] != NONE]}
                    if c == '04':
                        g['crouch'] = [[ammo[squat[i][0]], squat[i][1]] for i in r[14:19] if squat[i][0] != NONE]
                    else:
                        g['rapid'] = [[ammo[rapid[i][0]], rapid[i][1], rapid[i][2], WAIT[rapid[i][3]]]
                                      for i in r[14:19] if rapid[i][0] != NONE]
                    e['gun'] = g
                p = cost.get((row, lv))
                if p is not None:
                    m = mats((u16(p, o), p[o + 2]) for o in (4, 7, 10, 13))
                    if u16(p, 16):
                        m.append([cat[u16(p, 16)], u16(p, 18), 'pts'])
                    if m:
                        e['cost'] = m
                out.append(e)
            w['levels'] = out
            weapons[row] = w

        # Tree order: the forge list's roots in their order, each followed by what it upgrades into.
        order, seen = [], set()

        def walk(row, depth):
            if row in seen or row not in weapons:
                return
            seen.add(row)
            weapons[row]['depth'] = depth
            order.append(weapons[row])
            for k in sorted(weapons[row]['into'], key=lambda x: (x['level'], x['row'])):
                walk(k['row'], depth + 1)
        for row in sorted((r for r in weapons if r not in parent), key=lambda r: (forge.get(r, (9999,))[0], r)):
            walk(row, 0)
        for row in sorted(weapons):
            walk(row, 0)
        write(f'weapons/w{c}.json', {'id': f'w{c}', 'name': label, 'weapons': order})
        index.append({'id': f'w{c}', 'name': label, 'count': len(order)})
        print(f'  w{c} {label}: {len(order)} weapons, {sum(len(w["levels"]) for w in order)} levels')
    write('weapons.json', {'classes': index, 'sharpness': sharp})
