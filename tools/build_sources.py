"""Where every item comes from -> public/data/sources.json ({item id: [source, ...]}). Called by build_data.py.

Each source is [kind, where, detail, percent]. Read from the ROM:
- Gathering: the gathering points (build_gathering.py), per locale, rank and area.
- Quest rewards: each quest's reward tables (build_quests.py): slots A, B, C, D, Sub.
- Carves: rHagi enemy/hagi/hagi_s<N>_emMMM_VV in arc/enemy/emMMM_VV.arc. s1 Low Rank, s2 High Rank, s4 G Rank (the
  quest's mHagiLv; s0 / s3 are mHagiLv 0 / 3, used by 9 and 160 quests, left out). Slot s (1..19) starts at the entry
  index in file byte 4+s (0xff = none); entries from +26 are [u8 percent, u8 quantity, u16 item], a list ends at
  percent 0xff. The game picks slot 1+band (carve), 4+band (tail carve), 7+band (mining), 10+k+band (shiny drop) and
  16+k (gathered from it) -- band = the quest's boss mEmSubType % 3 (0x5c8b4), the Deviants' level bands.
  Traced in C:/MHGU-Extract/rewards-research/ (0xab9e0, 0xac030, 0xabd4c). This file used to read slots from byte 6
  with slot 0 at entry 0, which missed each Deviant's band-1 carve list (fixed 2026-11-14).
- Capture and part breaks: rBui quest/bui/bui_s<N> in loc/arc/result.arc (s1 Low, s2 High, s4 G): f32 2.0, u32
  record count, records of equal size: +0 u16 monster (low byte em, high byte variant, as the quests' mEmType), +2
  up to 18 [u8 code, u8 n], then from +38 one list per code, in code order, [u8 percent, u8 quantity, u16 item]
  ending 0xff (all 470 records: as many lists as codes). code = 10 x (N + 1) + band: N 0 is the capture, N 1..5 the
  breaks (0x3a661c, table 0x1623f46); a break's body part is in the monster's rEnemyDtBaseParts (build_rewards.py).
  Located against mhgu.db (capture and break lists).
- Combining: table/itemPreData.itp (24-byte rows: u16 index, u32 ingredient, u32 ingredient, u32 result, u8 success
  percent, u8 amount type -> table/itemPreTypeData.ipt). All 183 recipes and rates match mhgu.db; the amount
  types do not line up with mhgu.db's amounts and are not shown yet.
- Shop: table/shopList00.slt (shopList01.slt is identical): f32 1.0, u32 count, 16-byte rows [u32 index, u32 item,
  u32 unlock kind, u32 unlock value] (kind 0 = from the start; the other kinds are not read). Price: itemData.itm
  u32 +23 (buy; +19 sell, +6 carry limit -- each matches mhgu.db on all 2,866 items).
"""
import struct, sys

sys.path.insert(0, 'C:/MHGU-RE/offline/decode/lib')
import mh                                         # noqa: E402

ROM = 'C:/MHGU-ROM/romfs/nativeNX/'
RANK = {1: 'Low Rank', 2: 'High Rank', 4: 'G Rank'}
CARVE = [(1, 3, 'Carve'), (4, 6, 'Tail carve'), (7, 9, 'Mining'), (10, 15, 'Shiny drop'), (16, 19, 'Gathered from it')]


def carve_kind(slot):
    return next((k for a, b, k in CARVE if a <= slot <= b), None)


def hagi_lists(d):
    """[(slot, [(item, quantity, percent), ...])] for slots 1..19 (slot s starts at the entry in file byte 4+s)."""
    n = (len(d) - 26) // 4
    ents = [struct.unpack_from('<BBH', d, 26 + 4 * i) for i in range(n)]
    out = []
    for slot in range(1, 20):
        st = d[4 + slot]
        if st == 0xff:
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
        # one list per code, in code order: code = 10 x (N + 1) + band, N 0 the capture, N 1..5 the breaks
        labels = [('Capture' if c // 10 == 1 else f'Break {c // 10 - 1}', c % 10) for c in codes]
        yield 'em%03d_%02d' % (em & 0xff, em >> 8), list(zip(labels, lists))


def combinations():
    d = open(ROM + 'table/itemPreData.itp', 'rb').read()
    n = struct.unpack_from('<I', d, 4)[0]
    out = []
    for i in range(n):
        r = d[8 + 24 * i: 8 + 24 * (i + 1)]
        _, a, b, res = struct.unpack_from('<HIII', r, 0)
        out.append((a, b, res, r[14]))
    return out


def build(write, monster_names, gathering, quests, item_name):
    src = {}
    add = lambda item, s: src.setdefault(item, []).append(s)
    combos = combinations()
    write('combos.json', [{'a': item_name[a], 'b': item_name[b], 'result': item_name[r], 'rate': p,
                           'ids': [a, b, r]} for a, b, r, p in combos])
    for a, b, r, p in combos:
        add(r, ['Combining', f'{item_name[a]} + {item_name[b]}', 'Combine', p])
    itm = open(ROM + 'table/itemData.itm', 'rb').read()
    shop = open(ROM + 'table/shopList00.slt', 'rb').read()
    for i in range(struct.unpack_from('<I', shop, 4)[0]):
        _, it, kind, _v = struct.unpack_from('<IIII', shop, 8 + 16 * i)
        price = struct.unpack_from('<I', itm, 8 + 44 * it + 23)[0]
        add(it, ['Shop', 'Item shop', f'{price:,}z' + ('' if kind == 0 else ' · unlocks as you progress'), None])

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
