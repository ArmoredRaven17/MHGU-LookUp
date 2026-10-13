"""Compare the weapons read from the ROM (public/data/weapons/*.json, or a scratch build) with the Collection
Tracker's per-level files, field by field, and print every count. The tracker is a check, not a source.

    python tools/check_weapons.py [data dir]
"""
import json, os, re, sys, collections

DATA = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'public', 'data')
TRK = 'C:/Coding Repos/mhgu-collection-tracker/docs/data/'
FILE = {'00': 'great_sword', '01': 'sword_and_shield', '02': 'hammer', '03': 'lance', '04': 'heavy_bowgun',
        '06': 'light_bowgun', '07': 'long_sword', '08': 'switch_axe', '09': 'gunlance', '10': 'bow',
        '11': 'dual_blades', '12': 'hunting_horn', '13': 'insect_glaive', '14': 'charge_blade'}
RANK = {'Low Rank': 'LR', 'High Rank': 'HR', 'G Rank': 'G'}


def gauge(row, length, step):
    out, prev = [], 0
    for th in row:
        end = min(th, length)
        out.append(max(0, end - prev) // step)
        prev = max(prev, end)
    return out


def mat_name(m):
    """Our material name as the tracker spells it (mhgu.db names; categories 'LR Ore Materials')."""
    if len(m) == 3:
        name, rank = re.match(r'(.*) \((.*)\)$', m[0]).groups()
        return f'{RANK[rank]} {name} Materials'
    return m[0]


def norm(s):
    return re.sub(r'[^a-z0-9+]', '', s.lower())


index = json.load(open(os.path.join(DATA, 'weapons.json'), encoding='utf8'))
sharp = index['sharpness']
total = collections.Counter()
for c, f in FILE.items():
    ours = {w['row']: w for w in json.load(open(os.path.join(DATA, f'weapons/w{c}.json'), encoding='utf8'))['weapons']}
    trk = json.load(open(TRK + f'stats/{f}.json', encoding='utf8'))['byId']
    mats = json.load(open(TRK + f'materials/{f}.json', encoding='utf8'))
    n = collections.Counter()
    examples = collections.defaultdict(list)

    def check(key, ok, ex):
        n[(key, ok)] += 1
        if not ok and len(examples[key]) < 2:
            examples[key].append(ex)

    for wid, levels in trk.items():
        w = ours.get(int(wid))
        if not w:
            n[('missing weapon', False)] += 1
            continue
        by = {e['lv']: e for e in w['levels']}
        for t in levels:
            e = by.get(t['lv'])
            if not e:
                n[('missing level', False)] += 1
                continue
            form = [fm['name'] for fm in w['forms'] if fm['from'] <= t['lv']][-1]
            check('name', form == t['n'], (t['n'], t['lv'], form))
            check('raw', e['raw'] == t['raw'], (t['n'], t['lv'], e['raw'], t['raw']))
            check('aff', e['aff'] == t['aff'], (t['n'], t['lv'], e['aff'], t['aff']))
            check('def', e['defense'] == t['def'], (t['n'], t['lv']))
            check('slots', e['slots'] == t['slots'].count('◯'), (t['n'], t['lv']))
            check('rarity', w['rarity'] == (11 if t['rar'] == 'X' else t['rar']), (t['n'], w['rarity'], t['rar']))
            ele = [[w['element'], e['ele']]] if 'element' in w else []
            if 'element2' in w:
                ele.append([w['element2'], e['ele2']])
            check('element', ele == (t.get('ele') or []), (t['n'], t['lv'], ele, t.get('ele')))
            if 'sh' in t:
                row, start = e['sharp']
                check('sharpness', [gauge(sharp[row], start + 25 * h, 5) for h in range(3)] == t['sh'], (t['n'], t['lv']))
            x = t.get('x') or {}
            if 'phial' in x:
                want = f"{w['phial']} {e['phialValue']}" if e.get('phialValue') else w['phial']
                check('phial', want == x['phial'], (t['n'], t['lv'], want, x['phial']))
            if 'shell' in x:
                check('shelling', f"{w['shelling']} Lv{e['shellLv']}" == x['shell'], (t['n'], t['lv'], x['shell']))
            if 'notes' in x:
                check('notes', e['notes'] == x['notes'], (t['n'], t['lv'], e['notes'], x['notes']))
            if 'arc' in x:
                b = e['bow']
                check('arc', b['arc'] == f"Arc Shot: {x['arc']}", (t['n'], b['arc'], x['arc']))
                want = [re.sub(r'!$', '', s) for s in x['charges']]
                check('charge shots', b['shots'] == want, (t['n'], t['lv'], b['shots'], want))
                check('charges open', b['open'] == sum(1 for s in x['charges'] if not s.endswith('!')), (t['n'], t['lv']))
                COAT = {'Power Coating Lv1': 'Power Coating', 'Power Coating Lv2': 'Power Coating 2',
                        'Elem Coating Lv1': 'Element Coating', 'Elem Coating Lv2': 'Element Coating 2',
                        'C.Range Coating': 'Close Range Coating', 'Para Coating': 'Paralysis Coating'}
                check('coatings', sorted(norm(COAT.get(k, k)) for k in b['coatings']) == sorted(map(norm, x['coatings'])),
                      (t['n'], t['lv'], b['coatings'], x['coatings']))
            if 'stats' in x:
                g = e['gun']
                for k in ('reload', 'recoil', 'deviation'):
                    want = x['stats'][k]
                    check(k, g[k] == want or (want == '(None)' and g[k] == '-'), (t['n'], t['lv'], g[k], want))
                caps = collections.defaultdict(dict)
                for name, cap in g['ammo']:
                    m = re.match(r'(.*?)( Lv(\d))?$', name)
                    caps[m.group(1)][int(m.group(3) or 1)] = cap
                ok = True
                for k, v in x['ammo'].items():
                    kk = {'Paralysis S': 'Para S'}.get(k, k)
                    got = [caps.get(kk, {}).get(i + 1, 0) for i in range(len(v))]
                    ok &= got == v
                check('ammo', ok, (t['n'], t['lv'], x['ammo']))
                check('internal', sorted([a, tot, cl] for a, tot, cl in g['internal']) ==
                      sorted([i['ammo'], i['total'], i['cap']] for i in x.get('internal', [])), (t['n'], t['lv'], g['internal'], x.get('internal')))
                if 'rapid' in g:
                    want = sorted([r['ammo'], r['cap'], r['power'], r['wait']] for r in x.get('rapidFire', []))
                    check('rapid fire', sorted(g['rapid']) == want, (t['n'], t['lv'], g['rapid'], want))
                if 'crouch' in g:
                    want = [[s['ammo'], s['capacity']] for s in x.get('siege', [])]
                    check('crouching fire', sorted(g['crouch']) == sorted(want), (t['n'], t['lv'], g['crouch'], want))

    # Materials: the tracker's byId[weapon][level] (level 1 = forge or upgrade-into), parents.
    M = mats['mats']
    for wid, by in mats['byId'].items():
        w = ours.get(int(wid))
        if not w:
            continue
        lv = {e['lv']: e for e in w['levels']}
        forged = {cr['level']: cr['mats'] for cr in w.get('create', [])}
        for level, pairs in by.items():
            want = sorted((norm(M[i]), q) for i, q in pairs)
            if level == '1':
                continue                     # level 1 mixes forge and upgrade-into: checked below
            # The tracker adds a forge recipe at that level into the level's cost: compare the same sum.
            tot = collections.Counter()
            for m in lv.get(int(level), {}).get('cost', []) + forged.get(int(level), []):
                tot[norm(mat_name(m))] += m[1]
            check('upgrade cost (+ forge at that level)', sorted(tot.items()) == want, (w['name'], level, sorted(tot.items()), want))
    for wid, (pr, plv) in mats['parents'].items():
        w = ours.get(int(wid))
        check('parent', bool(w) and w.get('from') == {'row': pr, 'level': plv}, (wid, w and w.get('from'), pr, plv))
    for wid, cr in mats['create'].items():
        w = ours.get(int(wid))
        if 'f' in cr and w:
            want = sorted((norm(M[i]), q) for i, q in cr['f'][2])
            got = sorted((norm(mat_name(m)), m[1]) for m in w['levels'][0].get('cost', []))
            check('upgrade-into cost', got == want, (w['name'], got, want))
        if 'd' in cr and w:
            want = {(norm(M[i]), q) for i, q in cr['d']}
            got = {(norm(m[0]), m[1]) for cr in w.get('create', []) if cr['level'] == 1 for m in cr['mats']}
            check('forge (tracker drops a key item)', want <= got, (w['name'], got, want))

    keys = sorted({k for k, _ in n})
    print(f'w{c} {f}: ' + ', '.join(f'{k} {n[(k, True)]}/{n[(k, True)] + n[(k, False)]}' for k in keys))
    for k, ex in examples.items():
        print('    MISMATCH', k, ex)
    for k, v in n.items():
        total[k] += v
print('\nALL: ' + ', '.join(f'{k} {total[(k, True)]}/{total[(k, True)] + total[(k, False)]}' for k in sorted({k for k, _ in total})))
