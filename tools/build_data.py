"""Build the app's data (public/data/*.json) from the MHGU ROM.

    python tools/build_data.py            write public/data/
    python tools/build_data.py <outdir>   write somewhere else (to diff before replacing)

Every name and text comes from the game's own tables; nothing is carried over from the MHFU app.
Sources, per file:

- skills.json   eng/table/skillData_eng.gmd (2 strings per skill: name, description),
                eng/table/skillTypeData_eng.gmd (2 per skill tree), table/skillTypeData.skt (19-byte rows:
                +0 tree id, +5 seven u16 skill ids, one per point threshold -20/-15/-10/+10/+15/+20/+25 --
                the code constants at 0xdfb34), and the plain explanations written for MHGU Armor Skills
                Explained (C:/MHGU-Extract/skills-ledger/plain/*.json).
- styles.json   eng/table/CommonMsg_eng.gmd: names 134-137 / 185-186, the short text 169-172 / 187-188,
                the full text 129-132 / 183-184, the SP State text 189-194. Listed in the game's style
                order (style byte 0 Guild, 1 Striker, 2 Aerial, 3 Adept, 4 Alchemy, 5 Valor).
- arts.json     eng/table/hunterArtsData_eng.gmd: 4 strings per Art tier (name, name, short text,
                full text); tier id = the row of table/hunterArtsData.hta. Which weapon an Art belongs
                to is NOT read yet.
- weapons.json, weapons/wNN.json   read from the weapon tables: see tools/build_weapons.py.
- armor.json    the armor tables (layouts from the Collection Tracker's build-armor-data.mjs) with the
                names from eng/table/armorSeriesData_eng.gmd: see armor() below.
- decorations.json  table/decoData.deco (5-byte rows: slots, skill tree, points, second tree, signed
                points; row i is item 2638 + i) and table/decoCreate.dcd (16-byte rows: u16 jewel item,
                u16 recipe number, four [u16 item, qty]); names and texts from itemData_eng.gmd. All 242
                jewels and their 275 recipes match mhgu.db; the 9 rows the ROM names DUMMY are left out.
- monsters.json the MHGU Monster Viewer's ROM-read files (C:/MHGU-Extract/MHGU-Monster-Viewer/docs, each
                carrying its own source notes): hit-zone tables and part records (stagger, break, extract
                colour) from each monster's .dtt, capsules from the .bdd (which part record each zone row
                hits), quest levels from the quest files, class names from monsterName_eng. NOT from the
                ROM: the part names (community; the ROM has no part-name table), the monster -> class
                assignment (authored there, checked against the Quest Randomizer) and the id -> name join
                (mhgu.db; every name is the game's own text somewhere -- the Hub list, items, titles).
- quests.json   the quest files and their text: see tools/build_quests.py.
- gathering.json  every map's gathering points per rank: see tools/build_gathering.py.
- items.json    eng/table/itemData_eng.gmd (2 strings per item: name, description); the jewels are in
                decorations.json instead.
"""
import glob, json, os, struct, sys

ROM = 'C:/MHGU-ROM/romfs/nativeNX/'
LEDGER = 'C:/MHGU-Extract/skills-ledger/plain'
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'public', 'data')


def gmd(name):
    return gmd_path('table/' + name)


def gmd_path(path):
    """A GMD text table under eng/: its strings in order."""
    b = open(ROM + 'eng/' + path, 'rb').read()
    *_, count, _labels, size, _names = struct.unpack_from('<4sIIQIIIII', b, 0)
    return [x.decode('utf8', 'replace').replace('\r\n', '\n') for x in b[len(b) - size:].split(b'\0')][:count]


def rows(name, stride):
    d = open(ROM + 'table/' + name, 'rb').read()
    n = struct.unpack_from('<I', d, 4)[0]
    assert 8 + n * stride == len(d), (name, len(d), n, stride)
    return [d[8 + i * stride: 8 + (i + 1) * stride] for i in range(n)]


def write(name, data):
    os.makedirs(os.path.dirname(os.path.join(OUT, name)), exist_ok=True)
    with open(os.path.join(OUT, name), 'w', encoding='utf8') as f:
        json.dump(data, f, ensure_ascii=False, separators=(',', ':'))
    print(name, os.path.getsize(os.path.join(OUT, name)), 'bytes')


# ── Armor skills ────────────────────────────────────────────────────────────────────────────
POINTS = [-20, -15, -10, 10, 15, 20, 25]


def skills():
    sk, st = gmd('skillData_eng.gmd'), gmd('skillTypeData_eng.gmd')
    plain = {}
    for f in sorted(glob.glob(LEDGER + '/*.json')):
        for r in json.load(open(f, encoding='utf8')):
            plain[int(r['id'])] = r
    trees, in_tree = [], {}
    for r in rows('skillTypeData.skt', 19):
        tid = struct.unpack_from('<I', r, 0)[0]
        ladder = list(struct.unpack_from('<7H', r, 5))
        if tid == 0 or not any(ladder):
            continue
        # A slot past a tree's last skill repeats it (Attack's +25 is Attack Up (L) again), so each skill
        # is listed once, at the smallest total that activates it.
        rungs = {}
        for p, s in sorted(zip(POINTS, ladder), key=lambda x: abs(x[0])):
            if s and s not in rungs:
                rungs[s] = p
        trees.append({'id': tid, 'name': st[2 * tid], 'desc': st[2 * tid + 1],
                      'ladder': sorted(({'points': p, 'skill': s} for s, p in rungs.items()), key=lambda r: r['points'])})
        for s, p in rungs.items():
            in_tree.setdefault(s, []).append({'tree': tid, 'points': p})
    out = []
    for sid in range(1, len(sk) // 2):
        if sid not in in_tree:
            continue                       # a skill no tree reaches is not one a player can activate
        p = plain.get(sid, {})
        out.append({'id': sid, 'name': sk[2 * sid], 'desc': sk[2 * sid + 1], 'trees': in_tree[sid],
                    'explanation': p.get('explanation', ''), 'grantedBy': p.get('grantedBy', [])})
    write('skills.json', {'trees': trees, 'skills': out})
    print('  trees', len(trees), 'skills', len(out), 'explained', sum(1 for s in out if s['explanation']))


# ── Hunting Styles ──────────────────────────────────────────────────────────────────────────
def styles():
    c = gmd('CommonMsg_eng.gmd')
    # (name, short, full, SP State) string ids per style, in the game's style order.
    ids = [('Guild', 137, 172, 132, 192), ('Striker', 134, 169, 129, 189), ('Aerial', 136, 171, 131, 191),
           ('Adept', 135, 170, 130, 190), ('Alchemy', 186, 188, 184, 194), ('Valor', 185, 187, 183, 193)]
    out = []
    for key, n, s, f, sp in ids:
        assert c[n].startswith(key), (key, c[n])
        out.append({'key': key.lower(), 'name': c[n], 'short': c[s], 'full': c[f], 'sp': c[sp]})
    write('styles.json', out)


# ── Hunter Arts ─────────────────────────────────────────────────────────────────────────────
def arts():
    s = gmd('hunterArtsData_eng.gmd')
    n = len(rows('hunterArtsData.hta', 25))
    assert 4 * n == len(s), (n, len(s))
    out = [{'id': i, 'name': s[4 * i], 'short': s[4 * i + 2], 'full': s[4 * i + 3]}
           for i in range(1, n) if s[4 * i] not in ('@', '(None)')]     # '@' rows are empty slots
    write('arts.json', out)
    print('  arts', len(out))


# ── Weapons ─────────────────────────────────────────────────────────────────────────────────
def weapons():
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    import build_weapons
    build_weapons.build(gmd, rows, write, item_names(), point_categories())


# ── Armor ───────────────────────────────────────────────────────────────────────────────────
# The record layouts are the Collection Tracker's (scripts/build-armor-data.mjs, every field checked
# there against mhgu.db); the names here are the ROM's English text instead of mhgu.db's.
SLOTS = ['Head', 'Chest', 'Arms', 'Waist', 'Legs']
RANKS = ['Low Rank', 'High Rank', 'G Rank']


def s8(v):
    return v - 256 if v > 127 else v


def u16(r, o):
    return struct.unpack_from('<H', r, o)[0]


def item_names():
    s = gmd('itemData_eng.gmd')
    return {i: s[2 * i] for i in range(len(s) // 2)}


def point_categories():
    """Material-point categories (a recipe can cost N points of any material of a kind): the name from
    itemCategoryTypeData_eng.gmd, the rank from table/itemCategoryTypeData.ict (7-byte rows, +6 = 0 Low,
    1 High, 2 G; checked against mhgu.db's 'LR/HR/G <name> Materials', 277 of 277)."""
    s = gmd('itemCategoryTypeData_eng.gmd')
    return {i: f'{s[i]} ({RANKS[r[6]]})' for i, r in enumerate(rows('itemCategoryTypeData.ict', 7)) if i}


def series_label(names):
    """A set's label: the words its pieces' names share at the start and the end
    (Leather Headgear / Leather Vest -> Leather; Rathalos Helm S / Rathalos Mail S -> Rathalos S)."""
    words = [n.split() for n in names]
    if len(words) == 1:
        return names[0]
    def shared(lists):
        out = []
        for ws in zip(*lists):
            if len(set(ws)) > 1:
                break
            out.append(ws[0])
        return out
    head = shared(words)
    tail = shared([w[len(head):][::-1] for w in words])[::-1]
    label = ' '.join(head + tail)
    return label if head and len(head) + len(tail) < min(len(w) for w in words) else names[0]


def armor():
    names = gmd('armorSeriesData_eng.gmd')              # 10 per series: 5 piece names, 5 texts
    trees = gmd('skillTypeData_eng.gmd')
    item, cat = item_names(), point_categories()
    curves = [[v for v in r if v] for r in rows('armorBuildData.abd', 20)]

    create = []                                         # per slot: series -> [[item, qty]]
    for si in range(5):
        m = {}
        for r in rows(f'armorCreateA0{si}.acrd', 42):
            # +3 of each entry is a flag (0, 1 or 2) whose meaning is not read yet; left out.
            mats = [[item[u16(r, o)], r[o + 2]] for o in range(10, 38, 4) if u16(r, o)]
            for o in (0, 2, 4, 6):
                if u16(r, o):
                    m[u16(r, o)] = mats
        create.append(m)

    upgrades = {}                                       # series -> {level: [[name, qty(, 'pts')]]}
    for r in rows('armorProcessA00.apd', 38):
        mats = [[item[u16(r, o)], r[o + 2]] for o in (10, 13, 16, 19, 26, 29, 32, 35) if u16(r, o)]
        if u16(r, 22):
            mats.append([cat[u16(r, 22)], u16(r, 24), 'pts'])
        for o in (0, 2):
            if u16(r, o):
                upgrades.setdefault(u16(r, o), {})[u16(r, 8)] = mats

    out = []
    for sid, r in enumerate(rows('armorSeriesData.asd', 127)):
        assert u16(r, 0) == sid
        pieces = []
        for si, slot in enumerate(SLOTS):
            name = names[10 * sid + si]
            if name in ('(None)', 'DUMMY'):
                continue
            skills = [[trees[2 * u16(r, o)], s8(r[o + 2])]
                      for o in (28 + si * 15 + k * 3 for k in range(5)) if u16(r, o)]
            p = {'slot': slot, 'name': name, 'desc': names[10 * sid + 5 + si], 'slots': r[108 + si], 'skills': skills}
            if sid in create[si]:
                p['create'] = create[si][sid]
            pieces.append(p)
        if not pieces:
            continue
        defense = [r[106]]
        for gain in curves[r[107]]:
            defense.append(defense[-1] + gain)
        up = upgrades.get(sid, {})
        assert not up or max(up) == len(defense), (sid, max(up), len(defense))   # levels agree
        bm, gn = r[15], r[16]
        out.append({
            'id': sid, 'name': series_label([p['name'] for p in pieces]), 'rarity': r[103] + 1,
            'class': 'Both' if bm and gn else 'Gunner' if gn else 'Blademaster',
            'gender': 'Both' if r[13] and r[14] else 'Male' if r[13] else 'Female',
            'zenny': u16(r, 17),
            'res': [s8(r[o]) for o in range(23, 28)],
            'defense': defense,                     # defense at level 1, 2, ...
            'pieces': pieces,
            'upgrades': [up[lv] for lv in sorted(up) if lv > 1],   # the cost of reaching level 2, 3, ...
        })
    write('armor.json', out)
    print('  armor sets', len(out), 'pieces', sum(len(s['pieces']) for s in out))


# ── Decorations ─────────────────────────────────────────────────────────────────────────────
DECO_FIRST_ITEM = 2638


def decorations():
    s_ = gmd('itemData_eng.gmd')
    trees = gmd('skillTypeData_eng.gmd')
    item = item_names()
    recipes = {}
    for r in rows('decoCreate.dcd', 16):
        recipes.setdefault(u16(r, 0), []).append([[item[u16(r, o)], r[o + 2]] for o in (4, 7, 10, 13) if u16(r, o)])
    out = []
    for i, r in enumerate(rows('decoData.deco', 5)):
        iid = DECO_FIRST_ITEM + i
        if s_[2 * iid] == 'DUMMY':
            continue
        skills = [[trees[2 * r[1]], s8(r[2])]] + ([[trees[2 * r[3]], s8(r[4])]] if r[3] else [])
        out.append({'id': iid, 'name': s_[2 * iid], 'desc': s_[2 * iid + 1], 'slots': r[0],
                    'skills': skills, 'recipes': recipes.get(iid, [])})
    write('decorations.json', out)
    print('  decorations', len(out))
    return {DECO_FIRST_ITEM + i for i in range(len(rows('decoData.deco', 5)))}


# ── Monsters ────────────────────────────────────────────────────────────────────────────────
MV = 'C:/MHGU-Extract/MHGU-Monster-Viewer/docs/'
ZONE_TYPES = ['cut', 'impact', 'shot', 'fire', 'water', 'ice', 'thunder', 'dragon', 'stun', 'exhaust']


def monsters():
    load = lambda f: json.load(open(MV + f, encoding='utf8'))
    mons, hz = load('monsters.json')['monsters'], load('hitzones.json')['monsters']
    classes, levels = load('monster-classes.json')['classes'], load('quest-levels.json')
    level_names = levels['levelNames']
    out = []
    for m in mons:
        if not m['name']:
            continue
        e = {'id': m['id'], 'name': m['name'], 'small': m['small'], 'class': classes.get(m['id'], '')}
        lv = levels['monsters'].get(m['id'], {})
        e['quests'] = [[level_names[k], n] for k, n in sorted(lv.items(), key=lambda x: int(x[0]))]
        h = hz.get(m['id'])
        if h:
            names = h.get('names', {})
            zone_name = lambda slot: names.get(str(slot)) or f'Zone {slot + 1}'
            e['zones'] = [[{'name': zone_name(slot), 'values': [t[slot][k] for k in ZONE_TYPES]}
                           for slot in h['slotsDefined']] for t in h['tables']]
            hits = {}                                   # part record -> the zone rows whose capsules use it
            for c in h['capsules']:
                hits.setdefault(c[1], [])
                if zone_name(c[0]) not in hits[c[1]]:
                    hits[c[1]].append(zone_name(c[0]))
            # A part record has no name in the ROM: list it by number with the zones that point at it.
            e['parts'] = [{'n': i + 1, 'zones': hits.get(i, []), **h['parts'][i]}
                          for i in h['partsUsed'] if i < len(h['parts'])]
        out.append(e)
    order = [c for c in load('monster-classes.json')['_about']['order'] if any(e['class'] == c for e in out)]
    write('monsters.json', {'zoneTypes': ZONE_TYPES, 'classes': order, 'monsters': out})
    print('  monsters', len(out), 'with zones', sum(1 for e in out if 'zones' in e))
    return {e['id']: e['name'] for e in out}


# ── Quests ──────────────────────────────────────────────────────────────────────────────────
def quests(monster_names):
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    import build_quests
    return build_quests.build(gmd_path, write, monster_names)


# ── Gathering ───────────────────────────────────────────────────────────────────────────────
def gathering(reachable):
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    import build_gathering, build_quests
    msg = gmd_path('GUI/06_msg/questMessage_eng.gmd')
    names = {m: msg[i].replace(' (D)', '') for m, i in build_quests.MAP.items() if m < 100}
    build_gathering.build(gmd_path, write, item_names(), names, reachable)


# ── Items ───────────────────────────────────────────────────────────────────────────────────
def items(skip=()):
    s = gmd('itemData_eng.gmd')
    out, seen = [], set()
    for i in range(1, len(s) // 2):
        name, desc = s[2 * i], s[2 * i + 1]
        if not name.strip() or name.lower() == 'dummy' or name in ('--------', '(No Item)', '(None)') or set(name) <= set('-? '):
            continue
        if i in skip:
            continue                       # a decoration: listed on its own tab
        if desc == 'Program Data':
            continue                       # the game's internal copies (their text says so)
        if (name, desc) in seen:
            continue                       # the same item twice (the ammo appears once per gun kind)
        seen.add((name, desc))
        out.append({'id': i, 'name': name, 'desc': desc})
    write('items.json', out)
    print('  items', len(out))


if __name__ == '__main__':
    skills(); styles(); arts(); weapons(); armor(); gathering(quests(monsters())); items(decorations())
