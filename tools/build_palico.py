"""Palicoes: equipment (weapons, head and body armor), Palico Skills and Support Moves -> public/data/palico.json.

Field names are the ROM's own (props.for_class: the classes' createProperty registrations); positions were located
against mhgu.db (the Collection Tracker's database) and, where the screen shows a value, the code that shows it.

- Weapons: table/otWeaponData.owp, 31-byte packed cOtWeaponBase rows (name/description: otWeaponData_eng.gmd
  2i / 2i+1). u32 mIndex, u16 mModelID, u8 +6 mAttackTree, u8 +7 mKireColor, u8 +8 mElement, u8 +9 mSpType,
  u16 +10 mAttack, s8 +12 mAffinity, s16 +13 mElementValue, u16 +15 mBoomerangAttack, s8 +17 mBoomerangAffinity,
  s16 +18 mBoomerangElementValue, u8 +20 mBoomerangColor, u8 +21 mDef, u8 +22 mRare, u16 +23 mSortID,
  u32 +25 mPrice, u16 +29 mSrqrNo. Checked against mhgu.db palico_weapons: melee/ranged attack, affinity, element
  values, blunt, balance 495-498/499; rarity = mRare + 1 (498/499, the miss is an '@' row).
  Screen text (StartMenuMsg_eng.gmd, file 9 of the message getter 0x55a7f8): Atk Type = 497 + mAttackTree
  (Cutting / Blunt; 0x583378: the class's vt+0x124 reads it); mSpType picks 499 / 500 / 501 (Balanced / Close Range
  / Boomerang) through the table at rodata 0x16298a0 (0x5841ec). Element ids are the hunter weapons' (Weapons tab).
  Sharpness: mKireColor is on the hunters' colour scale (0 Red .. 6 Purple): the shared player function 0x29c63c
  returns it for a Prowler (the weapon's vt+0x144) where a hunter gets the colour index off its sharpness gauge,
  both stored at player +0x13f0 and read through vt+0x1fc. Handicraft (Palico Skill 10) adds 1, capped at 6
  (0xe4ebc: any equipped skill slot +0x24c..+0x252 == 10).
  Not shown: mBoomerangColor, mPrice (mhgu.db's forge cost is
  always 1.5 x mPrice; the code that charges it is not read), mSrqrNo.
- Armor: table/otArmorData.oar, 33-byte cOtArmorBase rows, one per set (otArmorData_eng.gmd 4i head name,
  4i+1 body name, 4i+2 / 4i+3 their descriptions). u32 mIndex, u16 mSortID, u8 +6 mModelID, u8 +7 mRare,
  u32 +8 mPrice, two bytes (+12 head, +13 body: 1 when the set has that piece; not registered), then per piece
  u16 defense and s8 fire, water, thunder, ice, dragon resistance (+14 head, +21 body), then mSeType,
  mGimmickDispType, mSymbolCol, mBaseColHelm, mBaseColBody. Rarity = mRare + 1 (493/499; the misses are '@').
- Forging: table/otWeaponCreate.oec / otArmorCreate.oec, 36-byte cOtEquipCreate rows: u32 mEquipNo, u16 mQuestLv,
  three u16 key items, six [u16 item, u16 quantity]; for armor slots 0-2 are the head piece's, 3-5 the body's.
  Materials match mhgu.db for every named piece (495 weapons, 513 armor sets). mQuestLv and the keys (what unlocks
  a recipe) are not read, so not shown.
- Palico Skills: rOtSkill (otomo/ot_skl in loc/arc/resident.arc), 11-byte rows: u32 mIndex, u8 mSortId,
  mSlotCost, mLearnLevel, mSkillKind (+3 zero bytes); text ot_skl_eng.gmd 2i / 2i+1. The skill screen
  (0x5e90b4) shows mSlotCost under 'Memory' (OtMenuMsg 75) and, under 'Conditions' (OtMenuMsg 36), 0x5ed1a4:
  mLearnLevel > 0 -> OtMenuMsg 81 'Reach Level %d. (Unlocks for all Palicoes.)', else 82 'None. (Available upon
  hiring.)'. mSkillKind is not shown (its text is not read).
- Support Moves: rOtSupportActionBase (otomo/support/spt_act_base, resident.arc), 24-byte rows: u32 mIndex,
  u16 mSortId, u16 mSupportGaugeCost, u8 mSupportActGroup, u8 mSupportKind, u8 mLotTimeType, u16 mInitLotTime,
  mRelotTime, mReuseTime, u8 mMissLotAdd, mIconType, mIconCol, u32 mClearEnemy; text
  eng/otomo/support/spt_act_base_eng.gmd 2i / 2i+1. The move screen (0x5e8f14): 'Gauge Use' (OtMenuMsg 26) =
  mSupportGaugeCost x 10 / 1000 (0x25cf90), 'Type' (27) = OtMenuMsg 28 + mSupportKind, 'Conditions' (0x5ecfe8):
  mClearEnemy indexes the monster table at rodata 0x16216c0; none -> OtMenuMsg 82, else 80 'Slay/Capture %s.'
  (94 'Slay %s.' for moves 13 and 36, 0x264268) with the monster's name: monster id -> GUI/06_msg/monsterName_eng.gmd string
  through the [u32 id, u32 string] table at rodata 0x1594ca4 (0x50aa8).
- Support Bias: bias n's name is CommonMsg 105 + n (0x55a958 returns n + 0x69) and its description OtMenuMsg
  83 + n (0x55a960 returns n + 0x53); eight biases (Charisma .. Beast).
"""
import struct, sys

ROM = 'C:/MHGU-ROM/romfs/nativeNX/'
RO = 0x13EF000
sys.path.insert(0, 'C:/MHGU-RE/offline/decode/lib')
import mh                                             # noqa: E402

ELEMENT = [None, 'Fire', 'Water', 'Thunder', 'Dragon', 'Ice', 'Poison', 'Paralysis', 'Sleep', 'Blast']
PLACEHOLDER = {'', '@', '(None)', '―', 'DUMMY', 'Hello', 'Good Morning'}
SLAY_ONLY = {13, 36}                                  # 0x264268


def table(name, size):
    d = open(ROM + 'table/' + name, 'rb').read()
    n = struct.unpack_from('<I', d, 4)[0]
    assert 8 + n * size == len(d), (name, len(d), n)
    return [d[8 + size * i: 8 + size * (i + 1)] for i in range(n)]


def resident(cls):
    d, ents = mh.arc_entries(ROM + 'loc/arc/resident.arc')
    return [mh.arc_extract(d, e) for e in ents if e[1] == mh.thash(cls)][0]


def build(gmd, gmd_path, write):
    item = gmd('itemData_eng.gmd')
    shop = gmd('LbShop_OtEqMsg_eng.gmd')
    menu, start, common = gmd('OtMenuMsg_eng.gmd'), gmd('StartMenuMsg_eng.gmd'), gmd('CommonMsg_eng.gmd')
    res = [common[57 + k] for k in range(5)]             # Fire Res .. Dragon Res, the rows' order
    ro = open('C:/MHGU-ROM/exefs/main.rodata', 'rb').read()
    u32 = lambda va: struct.unpack_from('<I', ro, va - RO)[0]

    def mats(raw):
        return [[item[2 * it], q] for it, q in raw if it]

    # Weapons
    W = gmd('otWeaponData_eng.gmd')
    wcreate = {struct.unpack_from('<I', r, 0)[0]: r for r in table('otWeaponCreate.oec', 36)}
    weapons = []
    for i, r in enumerate(table('otWeaponData.owp', 31)):
        name = W[2 * i]
        if name.strip() in PLACEHOLDER:
            continue
        el = ELEMENT[r[8]] if r[8] < len(ELEMENT) else None
        c = wcreate.get(i)
        weapons.append({
            'id': i, 'name': name, 'desc': W[2 * i + 1], 'rarity': r[22] + 1,
            'atkType': start[497 + r[6]], 'style': start[u32(0x16298a0 + 4 * r[9])], 'spType': r[9], 'atkTree': r[6],
            'sharpness': r[7],
            'melee': {'attack': struct.unpack_from('<H', r, 10)[0], 'affinity': struct.unpack_from('<b', r, 12)[0],
                      'element': struct.unpack_from('<h', r, 13)[0]},
            'ranged': {'attack': struct.unpack_from('<H', r, 15)[0], 'affinity': struct.unpack_from('<b', r, 17)[0],
                       'element': struct.unpack_from('<h', r, 18)[0]},
            'elementType': el, 'defense': r[21],
            'materials': mats(struct.unpack_from('<HH', c, 12 + 4 * k) for k in range(6)) if c else [],
        })

    # Armor
    A = gmd('otArmorData_eng.gmd')
    acreate = {struct.unpack_from('<I', r, 0)[0]: r for r in table('otArmorCreate.oec', 36)}
    head, body = [], []
    for i, r in enumerate(table('otArmorData.oar', 33)):
        c = acreate.get(i)
        slots = [struct.unpack_from('<HH', c, 12 + 4 * k) for k in range(6)] if c else [(0, 0)] * 6
        for part, out, o, nm, ds, mt in (('head', head, 14, A[4 * i], A[4 * i + 2], slots[:3]),
                                        ('body', body, 21, A[4 * i + 1], A[4 * i + 3], slots[3:])):
            if nm.strip() in PLACEHOLDER:
                continue
            out.append({'id': i, 'name': nm, 'desc': ds, 'rarity': r[7] + 1,
                        'defense': struct.unpack_from('<H', r, o)[0],
                        'res': list(struct.unpack_from('<5b', r, o + 2)),
                        'materials': mats(mt)})

    # Palico Skills
    K = gmd('ot_skl_eng.gmd')
    f = resident('rOtSkill')
    skills = []
    for i in range(struct.unpack_from('<I', f, 4)[0]):
        r = f[8 + 11 * i: 8 + 11 * (i + 1)]
        if i == 0 or K[2 * i].strip() in PLACEHOLDER:
            continue
        lvl = r[6]
        skills.append({'id': i, 'name': K[2 * i], 'desc': K[2 * i + 1], 'memory': r[5],
                       'condition': (menu[81] % lvl) if lvl else menu[82]})

    # Support Moves
    S = gmd_path('otomo/support/spt_act_base_eng.gmd')
    monster = gmd_path('GUI/06_msg/monsterName_eng.gmd')
    names = {}
    for k in range(0x89):                          # 137 pairs, then an end marker
        em, s = struct.unpack_from('<II', ro, 0x1594ca4 - RO + 8 * k)
        names[em] = monster[s]
    f = resident('rOtSupportActionBase')
    moves = []
    for i in range(struct.unpack_from('<I', f, 4)[0]):
        r = f[8 + 24 * i: 8 + 24 * (i + 1)]
        if i == 0 or S[2 * i].strip() in PLACEHOLDER:
            continue
        cost, kind, clear = struct.unpack_from('<H', r, 6)[0], r[9], struct.unpack_from('<I', r, 20)[0]
        em = u32(0x16216c0 + 4 * clear) if clear else 0
        cond = (menu[94 if i in SLAY_ONLY else 80] % names[em]) if em else menu[82]
        moves.append({'id': i, 'sort': struct.unpack_from('<H', r, 4)[0], 'name': S[2 * i], 'desc': S[2 * i + 1],
                      'gauge': cost * 10 // 1000, 'kind': kind, 'type': menu[28 + kind], 'condition': cond})
    moves.sort(key=lambda m: m['sort'])

    biases = [{'id': n, 'name': common[105 + n], 'desc': menu[83 + n]} for n in range(8)]

    out = {'weapons': weapons, 'head': head, 'body': body, 'skills': skills, 'moves': moves, 'biases': biases,
           'labels': {'atkType': menu[76], 'melee': menu[69], 'ranged': menu[71], 'memory': menu[75],
                      'conditions': menu[36], 'gauge': menu[26], 'type': menu[27], 'head': menu[51],
                      'body': menu[52], 'skills': menu[47], 'moves': menu[46], 'equipment': menu[54],
                      'attack': common[54], 'element': common[55], 'defense': common[56], 'affinity': start[261],
                      'rare': start[508], 'res': res, 'materials': shop[18], 'weapon': shop[15], 'bias': menu[42],
                      'sharpness': start[259], 'handicraft': K[2 * 10]}}
    write('palico.json', out)
    print('  palico: weapons', len(weapons), 'head', len(head), 'body', len(body), 'skills', len(skills),
          'moves', len(moves), 'biases', len(biases))
