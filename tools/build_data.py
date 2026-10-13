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
- weapons.json  the per-class indexes of the MHGU Armor Viewer (docs/weapons/wNN.json), each built from
                table/weaponNNBaseData / LevelData with its columns located against the Collection
                Tracker (their `source` fields carry the detail); the forms' names and texts from
                eng/table/weaponNNMsgData_eng.gmd (6 strings per row: name and text of three forms).
- items.json    eng/table/itemData_eng.gmd (2 strings per item: name, description).
"""
import glob, json, os, re, struct, sys

ROM = 'C:/MHGU-ROM/romfs/nativeNX/'
LEDGER = 'C:/MHGU-Extract/skills-ledger/plain'
VIEWER = 'C:/Coding Repos/mhgu-armor-viewer/docs/weapons'
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'public', 'data')


def gmd(name):
    b = open(ROM + 'eng/table/' + name, 'rb').read()
    *_, count, _labels, size, _names = struct.unpack_from('<4sIIQIIIII', b, 0)
    return [x.decode('utf8', 'replace').replace('\r\n', '\n') for x in b[len(b) - size:].split(b'\0')][:count]


def rows(name, stride):
    d = open(ROM + 'table/' + name, 'rb').read()
    n = struct.unpack_from('<I', d, 4)[0]
    assert 8 + n * stride == len(d), (name, len(d), n, stride)
    return [d[8 + i * stride: 8 + (i + 1) * stride] for i in range(n)]


def write(name, data):
    os.makedirs(OUT, exist_ok=True)
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
CLASSES = ['w00', 'w07', 'w01', 'w11', 'w02', 'w12', 'w03', 'w09', 'w08', 'w14', 'w13', 'w06', 'w04', 'w10']
SHELL = {0: 'Normal', 1: 'Wide', 2: 'Long'}


def weapons():
    out = []
    for cls in CLASSES:
        d = json.load(open(f'{VIEWER}/{cls}.json', encoding='utf8'))
        if cls == 'w12':                        # the note colour names, as the index's source records them
            m = re.search(r'\((1 White[^)]*)\)', d['source']['notes'])
            NOTE = {int(k): v.strip() for k, v in (x.strip().split(' ', 1) for x in m.group(1).split(','))}
            assert len(NOTE) == 8, NOTE
        msg = gmd(f'weapon{cls[1:]}MsgData_eng.gmd')
        ws = []
        for w in sorted(d['weapons'], key=lambda w: (w['order'], w['row'])):
            if not w.get('named'):
                continue
            r = w['row']
            forms = []
            for k in range(3):
                name, text = msg[6 * r + 2 * k], msg[6 * r + 2 * k + 1]
                if name and name != w['name'] or k == 0:
                    forms.append({'name': name, 'text': text})
            assert forms[0]['name'] == w['name'], (cls, r, forms[0]['name'], w['name'])
            e = {'row': r, 'name': w['name'], 'forms': forms, 'rarity': w['rarity'], 'forge': w['forge']}
            if w.get('element'): e['element'] = w['element']
            if 'phial' in w: e['phial'] = w['phial']
            if 'shell' in w: e['shell'] = {'type': SHELL[w['shell']['type']], 'level': w['shell']['level'] + 1}
            if 'notes' in w: e['notes'] = [NOTE[x] for x in w['notes']]
            if 'charges' in w: e['charges'] = w['charges']
            ws.append(e)
        out.append({'id': cls, 'name': d['name'], 'weapons': ws})
        print(f'  {cls} {d["name"]}: {len(ws)}')
    write('weapons.json', out)


# ── Items ───────────────────────────────────────────────────────────────────────────────────
def items():
    s = gmd('itemData_eng.gmd')
    out, seen = [], set()
    for i in range(1, len(s) // 2):
        name, desc = s[2 * i], s[2 * i + 1]
        if not name.strip() or name.lower() == 'dummy' or name in ('--------', '(No Item)', '(None)') or set(name) <= set('-? '):
            continue
        if desc == 'Program Data':
            continue                       # the game's internal copies (their text says so)
        if (name, desc) in seen:
            continue                       # the same item twice (the ammo appears once per gun kind)
        seen.add((name, desc))
        out.append({'id': i, 'name': name, 'desc': desc})
    write('items.json', out)
    print('  items', len(out))


if __name__ == '__main__':
    skills(); styles(); arts(); weapons(); items()
