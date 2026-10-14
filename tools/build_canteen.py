"""The Canteen: ingredients, dishes, their effects and their sauces' Felyne skills -> public/data/canteen.json.

Read from the ROM (romfs table/ and eng/table/Kitchen_eng.gmd, catSkillData_eng.gmd):
- Ingredients: the game's id -> name table at rodata 0x161f488 (8-byte records [u32 Kitchen string, u32 0], read by
  0x1a7514; 45 ingredients). The id order groups the original ingredients with the ones GU added (e.g. 7-8
  Dragontail, Larinoth Cuts after the seven original meats).
- Dishes: table/kitchenListMenu.kcm, 35-byte rows, fields named by cKitchenListMenu's own registration: s32
  mIngredientA, s32 mIngredientB (-1: on the menu from the start), u8 mKitchenLevel, mVital, mStamina,
  mOtomoVital, mOtomoTension, mAttack, mDefense, mResistFire/Water/Thunder/Ice/Dragon, mOtomoAttack, mOtomoDefense,
  mOtomoResist x5, s32 mMenuType, s32 mMenuType2 (not shown). Dish name = Kitchen string 134 + row (188 + row past
  row 76): 0x1a6e98.
- Sauces: table/kitchenListSkillSet.kcs (cKitchenListSkillSet: mMenuType, mSauceType, mKitchenSkill0..2): a dish
  offers every set of its mMenuType, in table order (0x732618). Sauce name = Kitchen 48 + mSauceType, with the tag
  0x7338ac adds (read for MHGU Armor Skills Explained's Food Skills: C:/MHGU-Extract/food-skills/out/K-sauce-tags.json).
  Skill 66 / 67 = drawn from kitchenListSkillRandom.kcr / kitchenListSkillAlcohol.kca (catSkillData has no text for
  either id; shown as Raven's section name 'Food Skills'). Their s32 mOpenType is not read, so not shown.
- Odds, read for the Food Skills page (C:/MHGU-Extract/food-skills/gen_meals.py, 0x1a64d4, 0x161f430): a set's
  first skill activates 80% of the time, its second 60%, its third never; with the chef Fired Up (the dish on the
  day's list) 100% / 70-90% / 30-70% by Canteen level; a Gourmet Voucher activates all three.
- Unlocks: an ingredient is on the list when its bit is set (word +0x97c of the save's kitchen block; tested by
  0x1a607c, 45 bits). Three things set the bits:
  1. The Canteen itself sets ingredients 0 and 1 every time it is used (0x1a4be0, 0x1a54c4): on the list from the
     start.
  2. The progress check 0x3e9bec, against two counters the save keeps (+0x3e0, +0x3e2). 0x50bf08 rebuilds them
     from rQuestGroup: a counter reaches k+1 once every quest whose mAttribute1 is 0x18+k (Village counter) or
     0x22+k (Hub counter) is cleared. Village thresholds come from the table at rodata 0x162461c ([u16
     ingredient, u16 counter] x7); the Hub ones are immediates in the code (35 at 5, 41 at 7, 8 at 10).
  3. NPC dialogue: rNpcTalkData (loc/arc/npc/talk.arc, one per NPC; 37-byte packed records, mIndex then
     mPageAttribute, mTalkAttribute ... three 6-byte tags [u8 tag, u8, u16 A, u16 B], then u16 mAction1,
     mAction1Param, mAction2, mAction2Param, mAction2Param2). mAction2 17-21 adds an ingredient (0x2477c4 ->
     0x3f0720): group base 0 / 9 / 19 / 29 / 39 plus mAction2Param2 - 1. The page's conditions are on the
     nearest record at or before it with a nonzero mTalkAttribute (the following records continue its
     conversation). The tags (evaluator 0x244d34): 0x0b = quest B cleared (0x523084), 1 / 2 = talk flag A set /
     not set, 0x29 = Villager Request B fulfilled (the bit 0x7a5400 sets when the request's items are handed over).
     Villager Requests: rTradeDeliveryList (table/lobby/tradeDeliveryList in loc/arc/village/common.arc,
     36-byte rows: u32 NpcName index, u32, ..., three [u16 item, u16 quantity] from +20); request B = row B-1.
  Hot Heart's page needs talk flag 382, which the Harth Chief's daughter's page sets (npc_050 record 9); the
  Harth Chief introduces himself on the page that gives it (npc_336 record 0).
"""
import json, struct, sys

ROM = 'C:/MHGU-ROM/romfs/nativeNX/'
FOOD = 'C:/MHGU-Extract/food-skills/'
sys.path.insert(0, 'E:/offline/decode/lib')
import mh                                             # noqa: E402

TALK_ARC = ROM + 'loc/arc/npc/talk.arc'
COMMON_ARC = ROM + 'loc/arc/village/common.arc'
GROUP_BASE = {17: 0, 18: 9, 19: 19, 20: 29, 21: 39}     # mAction2 -> first ingredient of its group
VILLAGE_TABLE = 0x162461c                             # [u16 ingredient, u16 Village counter] x7
HUB_STEPS = [(35, 5), (41, 7), (8, 10)]               # 0x3e9ef8..0x3e9fc8: ingredient at Hub counter
HOT_HEART_FLAG = 382


def arc_file(path, cls):
    d, ents = mh.arc_entries(path)
    return [(e[0], mh.arc_extract(d, e)) for e in ents if e[1] == mh.thash(cls)]


def progress_quests():
    """{('Village' | 'Hub', counter value): [quest numbers whose clears raise the counter to it]}"""
    g = arc_file(COMMON_ARC, 'rQuestGroup')[0][1]
    out = {}
    for i in range(struct.unpack_from('<I', g, 4)[0]):
        q, a1 = struct.unpack_from('<IB', g, 8 + 7 * i)
        if 0x18 <= a1 <= 0x21:
            out.setdefault(('Village', a1 - 0x18 + 1), []).append(q)
        elif 0x22 <= a1 <= 0x2e:
            out.setdefault(('Hub', a1 - 0x22 + 1), []).append(q)
    return out


def unlocks(gmd, quest_info):
    """[[way, ...] per ingredient]; a way is {'kind': 'start' | 'quest' | 'request' | 'talk', ...}."""
    ways = [[] for _ in range(45)]
    for i in (0, 1):
        ways[i].append({'kind': 'start'})

    def quest(no, via):
        q = quest_info.get(no, {})
        return {'kind': 'quest', 'via': via, 'quest': no, 'title': q.get('title', str(no)),
                'category': q.get('category', ''), 'stars': q.get('stars', '')}

    groups = progress_quests()
    ro = open('C:/MHGU-ROM/exefs/main.rodata', 'rb').read()
    village = [struct.unpack_from('<HH', ro, VILLAGE_TABLE - 0x13EF000 + 4 * k) for k in range(7)]
    for side, steps in (('Village', village), ('Hub', HUB_STEPS)):
        for ing, level in steps:
            ways[ing] += [quest(q, 'progress') for q in groups[(side, level)]]

    npc = gmd('NpcName_eng.gmd')
    item = gmd('itemData_eng.gmd')
    t = arc_file(COMMON_ARC, 'rTradeDeliveryList')[0][1]
    requests = []
    for i in range(struct.unpack_from('<I', t, 4)[0]):
        r = t[8 + 36 * i: 8 + 36 * (i + 1)]
        requests.append({'npc': npc[struct.unpack_from('<I', r, 0)[0]],
                         'items': [{'id': x, 'name': item[2 * x], 'qty': n}
                                   for x, n in (struct.unpack_from('<HH', r, 20 + 4 * k) for k in range(3)) if x]})

    for name, d in sorted(arc_file(TALK_ARC, 'rNpcTalkData')):
        n = struct.unpack_from('<I', d, 4)[0]
        assert 8 + 37 * n == len(d), name
        recs = [d[8 + 37 * i: 8 + 37 * (i + 1)] for i in range(n)]
        for i, rec in enumerate(recs):
            a2, _, p2 = struct.unpack_from('<3H', rec, 31)
            if a2 not in GROUP_BASE:
                continue
            ing = GROUP_BASE[a2] + p2 - 1
            head = next(recs[k] for k in range(i, -1, -1) if recs[k][5])
            tags = [struct.unpack_from('<BxHH', head, 9 + 6 * k) for k in range(3)]
            done = [b for tag, a, b in tags if tag == 0x0b]
            req = [b for tag, a, b in tags if tag == 0x29]
            if done:
                ways[ing] += [quest(q, 'talk') for q in done]
            elif req:
                ways[ing] += [dict(kind='request', **requests[b - 1]) for b in req]
            elif any(tag == 1 and a == HOT_HEART_FLAG for tag, a, b in tags):
                ways[ing].append({'kind': 'talk', 'npc': npc[103]})
            else:
                raise ValueError(f'{name} record {i}: no condition read for ingredient {ing}')
    return ways
CHANCE = [{'normal': 80, 'fired': '100', 'gourmet': 100},
          {'normal': 60, 'fired': '70–90', 'gourmet': 100},
          {'normal': 0, 'fired': '30–70', 'gourmet': 100}]


def build(gmd, write, quest_info, brief):
    K = gmd('Kitchen_eng.gmd')
    cats = gmd('catSkillData_eng.gmd')
    skill = lambda i: cats[3 * i]
    ro = open('C:/MHGU-ROM/exefs/main.rodata', 'rb').read()
    ingredients = [K[struct.unpack_from('<I', ro, 0x161f488 - 0x13EF000 + 8 * i)[0]] for i in range(45)]

    m = open(ROM + 'table/kitchenListMenu.kcm', 'rb').read()
    dishes = []
    for i in range(struct.unpack_from('<I', m, 4)[0]):
        r = m[8 + 35 * i: 8 + 35 * (i + 1)]
        a, b = struct.unpack_from('<ii', r, 0)
        v = list(r[9:27])
        dishes.append({
            'name': K[134 + i] if i <= 76 else K[188 + i],
            'ingredients': [ingredients[a], ingredients[b]] if a >= 0 and b >= 0 else None,
            'level': r[8],
            'hunter': {'Health': v[0], 'Stamina': v[1], 'Attack': v[4], 'Defense': v[5], 'Fire Res': v[6],
                       'Water Res': v[7], 'Thunder Res': v[8], 'Ice Res': v[9], 'Dragon Res': v[10]},
            'palico': {'Health': v[2], 'Enthusiasm': v[3], 'Attack': v[11], 'Defense': v[12], 'Fire Res': v[13],
                       'Water Res': v[14], 'Thunder Res': v[15], 'Ice Res': v[16], 'Dragon Res': v[17]},
            'menu': struct.unpack_from('<i', r, 27)[0],
        })

    s = open(ROM + 'table/kitchenListSkillSet.kcs', 'rb').read()
    sets = [struct.unpack_from('<5i', s, 8 + 20 * i) for i in range(struct.unpack_from('<I', s, 4)[0])]
    tags = {t['index']: t['tag'] for t in json.load(open(FOOD + 'out/K-sauce-tags.json', encoding='utf8'))['sets']}
    menus = {}
    for i, (mt, sauce, *sk) in enumerate(sets):
        menus.setdefault(mt, []).append({
            'sauce': f"{K[48 + sauce]} {tags.get(i, '')}".strip(),
            'skills': ['Food Skills' if x in (66, 67) else skill(x) for x in sk if x],
        })

    def draw(name):
        d = open(ROM + 'table/' + name, 'rb').read()
        return [{'id': k, 'skill': skill(k), 'desc': cats[3 * k + 1], 'brief': brief.get(k, '')} for k, o in
                (struct.unpack_from('<2i', d, 8 + 8 * i) for i in range(struct.unpack_from('<I', d, 4)[0]))]

    ways = unlocks(gmd, quest_info)
    assert all(ways), [ingredients[i] for i, w in enumerate(ways) if not w]
    out = {'ingredients': ingredients, 'unlocks': ways, 'dishes': dishes, 'menus': {str(k): v for k, v in menus.items()},
           'random': draw('kitchenListSkillRandom.kcr'), 'alcohol': draw('kitchenListSkillAlcohol.kca'),
           'odds': CHANCE, 'sauces': [K[48 + i] for i in range(5)]}
    write('canteen.json', out)
    print('  canteen: ingredients', len(ingredients), 'dishes', len(dishes), 'sauce sets', len(sets))
