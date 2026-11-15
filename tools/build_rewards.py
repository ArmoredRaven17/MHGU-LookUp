"""Each monster's carves and drops, per rank -> monsters.json `rewards` (Raven, 2026-11-14: "we will want the
carves/drops for each monster").

The lists are the ones tools/build_sources.py reads for the items' sources (see its docstring for the file layouts):
rHagi enemy/hagi/hagi_s<N>_emMMM_VV (s1 Low Rank, s2 High Rank, s4 G Rank) for the carve, tail carve, mining, shiny
drop and gathered lists, and rBui quest/bui/bui_s<N> (loc/arc/result.arc) for capture and part breaks. Every list is
kept as the ROM has it: a group can hold several lists in one rank (a Deviant's level bands; the extra shiny drops of
Congalala, Arzuros, Zamtrios, Nakarkos, Altaroth, Gargwa, Larinoth) and rBui keeps one capture list per band. Which
list is which is not read yet, so the page shows a group only where a rank has one list for it, and breaks not at all
(the ROM numbers them; their link to a body part is not read).
"""
import os
import struct
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, 'C:/MHGU-RE/offline/decode/lib')
import mh                                         # noqa: E402
import build_sources as S                         # noqa: E402

ROM = 'C:/MHGU-ROM/romfs/nativeNX/'
RANK = {1: 'Low Rank', 2: 'High Rank', 4: 'G Rank'}
GROUP = {'Carve': 'carve', 'Tail carve': 'tail', 'Mining': 'mine', 'Shiny drop': 'shiny', 'Gathered from it': 'gather'}


def build(monster_ids, item_name):
    """{monster id: {rank: {group: [list, ...]}}}; a list is [[item id, item name, quantity, percent], ...].
    Groups: carve, tail, mine, shiny, gather (rHagi), capture (one per band), break (part number -> [lists])."""
    out = {}
    rows = lambda l: [[it, item_name.get(it, str(it)), q, p] for it, q, p in l]
    for mid in monster_ids:
        path = ROM + f'arc/enemy/{mid}.arc'
        if not os.path.exists(path):
            continue
        a, ents = mh.arc_entries(path)
        for e in ents:
            if e[1] != mh.thash('rHagi'):
                continue
            s = int(e[0].split(chr(92))[-1][6])
            if s not in RANK:
                continue
            for slot, l in S.hagi_lists(mh.arc_extract(a, e)):
                g = GROUP[S.carve_kind(slot)]
                out.setdefault(mid, {}).setdefault(RANK[s], {}).setdefault(g, []).append(rows(l))
    a, ents = mh.arc_entries(ROM + 'loc/arc/result.arc')
    for e in ents:
        if e[1] != mh.thash('rBui'):
            continue
        s = int(e[0].split(chr(92))[-1][5])
        if s not in RANK:
            continue
        for mid, lists in S.bui_records(mh.arc_extract(a, e)):
            if mid not in monster_ids:
                continue
            r = out.setdefault(mid, {}).setdefault(RANK[s], {})
            for (label, band), l in lists:
                if label == 'Capture':
                    r.setdefault('capture', []).append(rows(l))
                else:                                 # 'Break (part N)'
                    part = label.split('part ')[1].rstrip(')')
                    r.setdefault('break', {}).setdefault(part, []).append(rows(l))
    return out
