"""Compare the gathering data read from the ROM (public/data/gathering.json) with mhgu.db's gathering table
(community data, the check), per map, rank, area and kind of point. A point's list is compared as a set of
(item, quantity, percent). mhgu.db's item ids are the game's, so its items are named with the ROM's names.

    python tools/check_gathering.py [data dir]
"""
import collections, json, os, sqlite3, struct, sys

DATA = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'public', 'data')
DB = 'C:/Coding Repos/mhgu-collection-tracker/data-src/mhgu.db'
KIND = {'Gathering': 'Gather', 'Ore Mining': 'Mine', 'Insect Catching': 'Bug'}
RANK = {'Low Rank': 'LR', 'High Rank': 'HR', 'G Rank': 'G'}

b = open('C:/MHGU-ROM/romfs/nativeNX/eng/table/itemData_eng.gmd', 'rb').read()
*_, cnt, _l, size, _n = struct.unpack_from('<4sIIQIIIII', b, 0)
s = [x.decode('utf8') for x in b[len(b) - size:].split(b'\0')][:cnt]
item = {i: s[2 * i] for i in range(len(s) // 2)}

db = collections.defaultdict(lambda: collections.defaultdict(list))
for loc, rank, area, site, grp, fixed, rare, iid, qty, pct in sqlite3.connect(DB).execute(
        'select location_id, rank, area, site, group_num, fixed, rare, item_id, quantity, percentage from gathering'):
    db[(loc, rank, area, site, 'fixed' if fixed else 'rare' if rare else 'random')][grp].append((item[iid], qty, pct))

ours = collections.defaultdict(set)
for m in json.load(open(os.path.join(DATA, 'gathering.json'), encoding='utf8')):
    for r in m['ranks']:
        for a in r['areas']:
            for p in a['points']:
                key = (m['map'], RANK[r['rank']], a['name'], KIND[p['kind']])
                if not p.get('random'):
                    ours[key + ('fixed',)].add(tuple(sorted(map(tuple, p['items']))))
                else:
                    for i, o in enumerate(p['outcomes']):     # mhgu.db: the first outcome 'random', the others 'rare'
                        ours[key + ('random' if i == 0 else 'rare',)].add(tuple(sorted(map(tuple, o['items']))))

n = collections.Counter()
ex = collections.defaultdict(list)
for key, groups in db.items():
    want = {tuple(sorted(g)) for g in groups.values()}
    got = ours.get(key, set())
    for g in want:
        ok = g in got
        n[(key[4], ok)] += 1
        if not ok and len(ex[key[4]]) < 4:
            ex[key[4]].append((key, g[:4], len(got)))
extra = sum(len(v - {tuple(sorted(g)) for g in db.get(k, {}).values()}) for k, v in ours.items())
print('mhgu.db groups found in the ROM data: ' + ', '.join(f'{k} {n[(k, True)]}/{n[(k, True)] + n[(k, False)]}' for k in ('fixed', 'random', 'rare')))
print('ROM lists with no mhgu.db group:', extra, 'of', sum(len(v) for v in ours.values()),
      '(mhgu.db files the high-up points of some areas under "Secret"; the ROM keeps them in their area)')
for k, v in ex.items():
    print('  MISSING', k, v)
