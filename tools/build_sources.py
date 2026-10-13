"""Where every item comes from -> public/data/sources.json ({item id: [source, ...]}). Called by build_data.py.

Each source is [kind, where, detail, percent]. Read from the ROM:
- Gathering: the gathering points (build_gathering.py), per locale, rank and area.
- Quest rewards: each quest's reward tables (build_quests.py): slots A, B, C, D, Sub.
- Carves: rHagi enemy/hagi/hagi_s<N>_emMMM_VV in arc/enemy/emMMM_VV.arc. s1 Low Rank, s2 High Rank, s4 G Rank (s0
  and s3: not identified, left out). +6: 20 slots, each the entry index its list starts at (0xff = none; slot 0
  starts at entry 0); entries from +26 are [u8 percent, u8 quantity, u16 item], a list ends at percent 0xff.
  Slot groups, located against mhgu.db's hunting_rewards (every list matches): 0-1 carve, 2-4 tail carve, 5-7
  mining on the monster, 8-13 shiny drop, 14-16 gathered from the monster. A Deviant's extra slots in a group are
  its level bands; another monster's slots 9-13 are its other shiny drops.
- Capture and part breaks: rBui quest/bui/bui_s<N> in loc/arc/result.arc (s1 Low, s2 High, s4 G): f32 2.0, u32
  record count, records of equal size: +0 u16 monster (low byte em, high byte variant, as the quests' mEmType), +2
  up to 18 [u8 code, u8 n] (code = 10 x part + band), then from +38 lists of [u8 percent, u8 quantity, u16 item]
  ending 0xff. Per band: the capture list, then one break list per part of that band, in the header's order.
  Located against mhgu.db (capture and break lists). The game numbers parts; it never names them.
"""
import struct, sys

sys.path.insert(0, 'E:/offline/decode/lib')
import mh                                         # noqa: E402

ROM = 'C:/MHGU-ROM/romfs/nativeNX/'
RANK = {1: 'Low Rank', 2: 'High Rank', 4: 'G Rank'}
CARVE = [(0, 1, 'Carve'), (2, 4, 'Tail carve'), (5, 7, 'Mining'), (8, 13, 'Shiny drop'), (14, 16, 'Gathered from it')]


def carve_kind(slot):
    return next((k for a, b, k in CARVE if a <= slot <= b), None)


def hagi_lists(d):
    n = (len(d) - 26) // 4
    ents = [struct.unpack_from('<BBH', d, 26 + 4 * i) for i in range(n)]
    out = []
    for slot in range(20):
        st = 0 if slot == 0 else d[6 + slot]
        if slot and st == 0xff:
            continue
        l = []
        for p, q, it in ents[st:]:
            if p == 0xff:
                break
            l.append((it, q, p))
        if l:
            out.append((slot, l))
    return out


def bui_records(d):
    n = struct.unpack_from('<I', d, 4)[0]
    size = (len(d) - 8) // n
    for i in range(n):
        r = d[8 + size * i: 8 + size * (i + 1)]
        em = struct.unpack_from('<H', r, 0)[0]
        codes = [r[2 + 2 * k] for k in range(18) if r[2 + 2 * k]]
        lists, cur, o = [], [], 38
        while o + 4 <= len(r):
            p, q, it = struct.unpack_from('<BBH', r, o)
            if p == 0xff:
                lists.append(cur); cur = []
            elif p == 0 and not cur:
                break
            else:
                cur.append((it, q, p))
            o += 4
        # per band: capture, then the band's parts in header order
        labels = []
        for band in sorted({c % 10 for c in codes}) or [0]:
            labels.append(('Capture', band))
            labels += [(f'Break (part {c // 10})', band) for c in codes if c % 10 == band]
        yield 'em%03d_%02d' % (em & 0xff, em >> 8), list(zip(labels, lists))


def build(write, monster_names, gathering, quests):
    src = {}
    add = lambda item, s: src.setdefault(item, []).append(s)

    # gathering: [(item, locale, rank, area, kind, pct)]
    x = lambda q: f' ×{q}' if q > 1 else ''
    for item, loc, rank, area, kind, q, pct in gathering:
        add(item, ['Gathering', loc, f'{rank} · {area} · {kind}{x(q)}', pct])
    # quest rewards: [(item, quest label, slot, pct)]
    for item, label, slot, q, pct in quests:
        add(item, ['Quest reward', label, (f'Reward {slot}' if slot != 'Sub' else 'Subquest reward') + x(q), pct])

    # carves
    d, _ = None, None
    import glob, os
    for path in sorted(glob.glob(ROM + 'arc/enemy/em*.arc')):
        em = os.path.basename(path)[:-4]
        name = monster_names.get(em)
        if not name:
            continue
        a, ents = mh.arc_entries(path)
        h = mh.thash('rHagi')
        for e in ents:
            if e[1] != h:
                continue
            s = int(e[0].split(chr(92))[-1][6])
            if s not in RANK:
                continue
            for slot, l in hagi_lists(mh.arc_extract(a, e)):
                for it, q, p in l:
                    add(it, ['Monster', name, f'{RANK[s]} · {carve_kind(slot)}' + (f' ×{q}' if q > 1 else ''), p])

    # capture and breaks
    a, ents = mh.arc_entries(ROM + 'loc/arc/result.arc')
    h = mh.thash('rBui')
    for e in ents:
        if e[1] != h:
            continue
        s = int(e[0].split(chr(92))[-1][5])
        if s not in RANK:
            continue
        for em, lists in bui_records(mh.arc_extract(a, e)):
            name = monster_names.get(em)
            if not name:
                continue
            nbands = len({b for (_, b), _ in lists})
            for (label, band), l in lists:
                tier = f' · tier {band + 1}' if nbands > 1 else ''
                for it, q, p in l:
                    add(it, ['Monster', name, f'{RANK[s]} · {label}{tier}' + (f' ×{q}' if q > 1 else ''), p])

    out = {}
    for k, v in src.items():                         # the same source twice (two points sharing a list) once
        seen, keep = set(), []
        for x in v:
            if tuple(x) not in seen:
                seen.add(tuple(x)); keep.append(x)
        out[str(k)] = keep
    write('sources.json', out)
    src = out
    print('  sources: items', len(src), 'entries', sum(len(v) for v in src.values()))
