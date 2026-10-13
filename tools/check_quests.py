"""Compare the quests read from the ROM (public/data/quests.json) with the Quest Randomizer's QuestData.json
(Kiranico-scraped), joined by title and category, and print every count. The Randomizer is a check, not a source.

    python tools/check_quests.py [data dir]
"""
import collections, json, os, re, sys

DATA = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'public', 'data')
RANDO = 'C:/Coding Repos/MHGU Quest Randomizer/QuestData.json'
TYPE = {'Village': 'Village', 'Hub': 'Hub', 'Arena': 'Arena', 'Special Permit': 'Special Permits', 'Event': 'Events'}


def rando_level(q):
    """Our quest's level in the Randomizer's scheme (its LEVELS table)."""
    if q['category'] == 'Village':
        return 11 if q['level'] == 10 and q['rank'] == 'G Rank' else q['level']
    if q['category'] == 'Hub':
        return q['level'] - 10 if q['level'] > 10 else q['level']
    if q['category'] == 'Special Permit':
        return q['level'] - 100
    if q['category'] == 'Event':
        return {'Low Rank': 1, 'High Rank': 2, 'G Rank': 3}.get(q['rank'])
    return None


ours = json.load(open(os.path.join(DATA, 'quests.json'), encoding='utf8'))
theirs = json.load(open(RANDO, encoding='utf-8-sig'))
by = collections.defaultdict(list)
for r in theirs:
    t = 'Hub' if r['Type'] == 'Pub' else r['Type']      # the Randomizer files G-rank Hub quests as "Pub"
    by[(r['Name'].split('//', 1)[-1].strip().lower(), t)].append(r)

n = collections.Counter()
ex = collections.defaultdict(list)


def check(key, ok, e):
    n[(key, ok)] += 1
    if not ok and len(ex[key]) < 4:
        ex[key].append(e)


joined = 0
for q in ours:
    t = TYPE.get(q['category'])
    cand = by.get((q['title'].strip().lower(), t), []) if t else []
    if q['category'] == 'Hub':
        cand = [r for r in cand if (r['Type'] == 'Pub') == (q['rank'] == 'G Rank')]
    if len(cand) != 1:
        n[('joined', False)] += 1
        continue
    r = cand[0]
    n[('joined', True)] += 1
    check('locale', re.sub(r' \([DN]\)$', '', q['locale']) == r['Locale'], (q['id'], q['title'], q['locale'], r['Locale']))
    check('objective', q['objective'].replace('\n', ' ') == r['Main'], (q['id'], q['title'], q['objective'], r['Main']))
    lv = rando_level(q)
    if lv is not None:
        check('level', lv == r['Level'] or (r['Type'] == 'Pub' and q['level'] == 14 and r['Level'] == 5), (q['id'], q['title'], q['stars'], q['rank'], r['Name'], r['Level']))
    check('key', q['key'] == r['Key'], (q['id'], q['title'], q['key'], r['Key']))
    mine = {m[1] for m in q['monsters']}             # all the quest's large monsters
    want = set(r['Monsters'])                       # the Randomizer lists the targets only
    check('targets among the main monsters', want <= mine, (q['id'], q['title'], sorted(mine), sorted(want)))

print(', '.join(f'{k} {n[(k, True)]}/{n[(k, True)] + n[(k, False)]}' for k in sorted({k for k, _ in n})))
for k, v in ex.items():
    print('  MISMATCH', k, v)
