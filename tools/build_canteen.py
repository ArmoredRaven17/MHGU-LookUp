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
  Skill 66 / 67 = a Daily Skill drawn from kitchenListSkillRandom.kcr / kitchenListSkillAlcohol.kca.
- Odds, read for the Food Skills page (C:/MHGU-Extract/food-skills/gen_meals.py, 0x1a64d4, 0x161f430): a set's
  first skill activates 80% of the time, its second 60%, its third never; with the chef Fired Up (the dish on the
  day's list) 100% / 70-90% / 30-70% by Canteen level; a Gourmet Voucher activates all three.
Not read: which quest, request or rank unlocks each ingredient (the help text says quests, Hunter Rank and
villagers' requests; the record behind it is in the game's code, not in a table).
"""
import json, struct

ROM = 'C:/MHGU-ROM/romfs/nativeNX/'
FOOD = 'C:/MHGU-Extract/food-skills/'
CHANCE = [{'normal': 80, 'fired': '100', 'gourmet': 100},
          {'normal': 60, 'fired': '70–90', 'gourmet': 100},
          {'normal': 0, 'fired': '30–70', 'gourmet': 100}]


def build(gmd, write):
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
            'skills': ['Daily Skill' if x == 66 else 'Daily Drink Skill' if x == 67 else skill(x) for x in sk if x],
        })

    def draw(name):
        d = open(ROM + 'table/' + name, 'rb').read()
        return [{'skill': skill(k), 'later': bool(o)} for k, o in
                (struct.unpack_from('<2i', d, 8 + 8 * i) for i in range(struct.unpack_from('<I', d, 4)[0]))]

    out = {'ingredients': ingredients, 'dishes': dishes, 'menus': {str(k): v for k, v in menus.items()},
           'daily': draw('kitchenListSkillRandom.kcr'), 'dailyDrink': draw('kitchenListSkillAlcohol.kca'),
           'odds': CHANCE, 'sauces': [K[48 + i] for i in range(5)]}
    write('canteen.json', out)
    print('  canteen: ingredients', len(ingredients), 'dishes', len(dishes), 'sauce sets', len(sets))
