"""Gathering: every map's gathering points and what each one drops, per rank -> public/data/gathering.json.
Called by build_data.py; `python tools/check_gathering.py` compares it with mhgu.db's gathering table (community
data: the check, never the source).

Read from each map's archive (loc/arc/stage/map_com/mNN.arc):
rItemPopList stage/mNNd/mNNd_<rank> ('IPL'; ranks low, high, g -- also easy, tuto, clct1..3, not used here):
  +0x10 u32 n1, +0x14 u32 offset of table 2 (from +0x24), +0x1c u32 n2; table 1 at +0x24: n1 x [u32 offset, u32
  count] (offsets from +0x24); table 2 likewise at +0x24 + that offset. A list is count x [u8 percent, u8 quantity,
  u16 item] then 0xff. Table 1 = the fixed points' lists, table 2 = the random points' lists.
rItemPopSet stage/mNNd/mNNd ('IPS'), +8 u32 area count, then three sections, each an area table of [u32 offset,
  u32 count] (offsets from the section start):
  section 1 at +0x34: the fixed points, 36-byte records: +0 u32 list (table 1), +4 three f32 position, ...,
  +28 two counts (not read), +30 the kind (0 Gathering, 2 Ore Mining, 3 Insect Catching, 20 the wood points and 22
  one honey ledge, both gathered like plants; 0xfe objects always point at list 0 and are not gathering points),
  +31 a model id, +32 u32 flag (not read).
  Area 0 is the base camp ('Base Camp', eng/table/HN_HunterTipsMsg_eng.gmd). mhgu.db's 'Secret' points are
  ordinary records of a numbered area here (Jurassic Frontier 8, Arctic Ridge 9, Misty Peaks 3, ...): the ROM
  has no secret-area marker, so the area number is shown.
  section 2 at +0x34 + hdr[0x18]: per area, groups of candidate positions for the random points (not used).
  section 3 at +0x34 + hdr[0x28]: per area, per random point, its outcomes: 6-byte records [u8 percent, u8 list
  (table 2), two counts, u8 kind, u8 model] -- e.g. 80% a normal list, 20% a rare one.
Ranks: a map's rank file is listed only if some quest is played on that map at that rank (mMonsterLv 0/1 -> low,
3 -> high, 5 -> g); Ancestral Steppe and others carry low files no quest loads.
Kind names: eng/GUI/06_msg/NetworkVillage_eng.gmd 75 'Ore Mining', 76 'Insect Catching', 79 'Gathering'.
Every list matches a mhgu.db gathering group exactly (item, quantity, percent); see check_gathering.py.
"""
import struct, sys

sys.path.insert(0, 'E:/offline/decode/lib')
import mh                                         # noqa: E402

STAGE = 'C:/MHGU-ROM/romfs/nativeNX/loc/arc/stage/map_com/m%02d.arc'
RANKS = [('low', 'Low Rank'), ('high', 'High Rank'), ('g', 'G Rank')]
KIND = {0: 79, 2: 75, 3: 76, 20: 79, 22: 79}       # kind -> NetworkVillage_eng.gmd string (20 wood, 22 a honey ledge)


def resource(path, cls, name):
    d, ents = mh.arc_entries(path)
    h = mh.thash(cls)
    for e in ents:
        if e[1] == h and e[0].split('\\')[-1] == name:
            return mh.arc_extract(d, e)
    return None


def pop_lists(d):
    def table(base, n):
        out = []
        for i in range(n):
            off, cnt = struct.unpack_from('<II', d, base + 8 * i)
            o, ents = base + off, []
            while d[o] != 0xff:
                pct, qty, item = struct.unpack_from('<BBH', d, o)
                ents.append((item, qty, pct))
                o += 4
            assert len(ents) == cnt
            out.append(ents)
        return out
    n1 = struct.unpack_from('<I', d, 0x10)[0]
    off2, _, n2 = struct.unpack_from('<III', d, 0x14)
    return table(0x24, n1), table(0x24 + off2, n2)


def pop_set(s):
    n = struct.unpack_from('<I', s, 8)[0]
    hdr = struct.unpack_from('<12I', s, 0x10)
    fixed, random = [], []
    for a in range(n):
        off, cnt = struct.unpack_from('<II', s, 0x34 + 8 * a)
        fixed.append([s[0x34 + off + 36 * k: 0x34 + off + 36 * (k + 1)] for k in range(cnt)])
    b3 = 0x34 + hdr[6]
    for a in range(n):
        off, cnt = struct.unpack_from('<II', s, b3 + 8 * a)
        pts = []
        for g in range(cnt):
            go, gc = struct.unpack_from('<II', s, b3 + off + 8 * g)
            pts.append([s[b3 + go + 6 * k: b3 + go + 6 * (k + 1)] for k in range(gc)])
        random.append(pts)
    return fixed, random


def build(gmd_path, write, item, map_names, reachable):
    """reachable: the (map, rank file) pairs some quest uses -- a map's other rank files are never loaded."""
    net = gmd_path('GUI/06_msg/NetworkVillage_eng.gmd')
    kind = {k: net[v] for k, v in KIND.items()}
    camp = next(x for x in gmd_path('table/HN_HunterTipsMsg_eng.gmd') if x == 'Base Camp')
    out, flat = [], []                               # flat: (item id, locale, rank, area, kind, quantity, percent)
    for m in range(1, 27):
        path = STAGE % m
        try:
            s = resource(path, 'rItemPopSet', 'm%02dd' % m)
        except FileNotFoundError:
            continue
        if not s:
            continue
        fixed, random = pop_set(s)
        ranks = []
        for stem, label in RANKS:
            if (m, stem) not in reachable:
                continue
            d = resource(path, 'rItemPopList', 'm%02dd_%s' % (m, stem))
            if not d:
                continue
            t1, t2 = pop_lists(d)
            named = lambda ents: [[item[i], q, p] for i, q, p in ents]
            areas = []
            for a in range(len(fixed)):
                points = []
                aname = camp if a == 0 else f'Area {a}'
                for r in fixed[a]:
                    li, k = struct.unpack_from('<I', r, 0)[0], r[30]
                    if k in kind and li < len(t1):
                        points.append({'kind': kind[k], 'items': named(t1[li])})
                        flat += [(i, map_names.get(m, f'Map {m}'), label, aname, kind[k], q, p) for i, q, p in t1[li]]
                for outcomes in random[a]:
                    # The outcomes in the ROM's order (mhgu.db calls the first one normal, the rest rare).
                    ch = [{'chance': o[0], 'items': named(t2[o[1]])} for o in outcomes if o[4] in kind and o[1] < len(t2)]
                    if ch:
                        points.append({'kind': kind[outcomes[0][4]], 'random': True, 'outcomes': ch})
                        for o in outcomes:
                            if o[4] in kind and o[1] < len(t2):
                                flat += [(i, map_names.get(m, f'Map {m}'), label, aname,
                                          f'{kind[o[4]]} (random point, {o[0]}%)', q, p) for i, q, p in t2[o[1]]]
                if points:
                    areas.append({'area': a, 'name': aname, 'points': points})
            if areas:
                ranks.append({'rank': label, 'areas': areas})
        if ranks:
            out.append({'map': m, 'name': map_names.get(m, f'Map {m}'), 'ranks': ranks})
    write('gathering.json', out)
    print('  gathering maps', len(out), 'points', sum(len(a['points']) for x in out for r in x['ranks'] for a in r['areas']))
    return flat
