"""Each monster's carves and drops, per rank -> monsters.json `rewards` (Raven, 2026-11-14: "we will want the
carves/drops for each monster"; groups "Carve / Tail Carve / Mine / Shiny Drop / Gather / Capture / Break"; "One
section per rank"; breaks named "by the hit zone table names that I labelled").

The lists are the ones tools/build_sources.py reads (see its docstring for rHagi / rBui and how the game picks them):
- rHagi slot s: 1+band carve, 4+band tail carve, 7+band mining, 10+k+band shiny drop, 16+k gathered from it.
  band = the quest's boss mEmSubType % 3, a Deviant's level band; k (a monster's extra shiny drops: Congalala,
  Arzuros, Zamtrios, Nakarkos, Altaroth, Gargwa, Larinoth) is picked by the monster's own class and is not read.
- rBui: per code, band = code % 10; N = code // 10 - 1, 0 the capture and 1..5 the breaks.
- A break's body part: rEnemyDtBaseParts (enemy/dt_base/emMMM_VV_dtbparts, loader 0x556a0): u8 row count at +8, rows
  from +0x4d of [u8 part, u8 flinches Low/High Rank, u8 flinches G Rank, s8 break]. When a part's flinch count reaches
  the row's threshold (0x97d20 -> 0x99edc) the break (break & 0x7f) is awarded; a negative break needs every one of its
  rows, a positive one any of them. `part` is the .dtt part-record index (0x99cfc): the same records as the page's
  Parts table, so a break is named by those parts' names (zone-review.json `parts`, named by Raven in the Monster
  Viewer). Rathian: 1 Head, 2 Left Wing / Right Wing, 3 Back / Belly. (Naming by hit-zone slots does not work: one part
  record's capsules sit in several slots -- Rathian's back record reaches the Head slot too.) Breaks the
  monster's own code awards with no row (Hermitaur / Ceanataur shells by the shell carried, Ahtal-Ka's 4 and 5) have
  no part to name and are left out. Traced in C:/MHGU-Extract/rewards-research/.
"""
import json
import os
import struct
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, 'C:/MHGU-RE/offline/decode/lib')
import mh                                         # noqa: E402
import build_sources as S                         # noqa: E402

ROM = 'C:/MHGU-ROM/romfs/nativeNX/'
MV = 'C:/MHGU-Extract/MHGU-Monster-Viewer/docs/'
RANK = {1: 'Low Rank', 2: 'High Rank', 4: 'G Rank'}
GROUP = {'Carve': 'carve', 'Tail carve': 'tail', 'Mining': 'mine', 'Shiny drop': 'shiny', 'Gathered from it': 'gather'}
BAND_BASE = {'carve': 1, 'tail': 4, 'mine': 7}       # slot = base + band


def break_parts(arc_data, arc_ents, mid):
    """{break N: [part, ...]} from the monster's rEnemyDtBaseParts rows."""
    e = next((x for x in arc_ents if x[0].endswith(mid + '_dtbparts')), None)
    if not e:
        return {}
    d = mh.arc_extract(arc_data, e)
    out = {}
    for i in range(d[8]):
        part, _lh, _g, n = struct.unpack_from('<BBBb', d, 0x4d + 4 * i)
        n &= 0x7f
        if n and part not in out.setdefault(n, []):
            out[n].append(part)
    return out


def band_labels(title):
    """{(monster id, rank, band): 'I-IV' | 'G3-G5' | 'EX'}: the levels of the Special Permit quests whose boss slot holds
    that monster with that band (mEmSubType % 3) at that reward rank (mHagiLv), named as the quests' own titles name
    them ("Dreadqueen G1: Capture" -> G1), first to last (Raven, 2026-11-14: "By title levels (I-IV, G1-G2, EX)")."""
    import questdata
    seen = {}
    for q in questdata.real_quests():
        if q['mQuestNo'] // 10000 != 4 or q['mHagiLv'] not in RANK:
            continue
        t = title(q['mQuestNo'])
        if ':' not in t:
            continue
        level = t.split(':')[0].split()[-1]
        for b in q['boss']:
            if not b['EmType']:
                continue
            mid = 'em%03d_%02d' % (b['EmType'] & 0xFF, b['EmType'] >> 8)
            key = (mid, RANK[q['mHagiLv']], b['EmSubType'] % 3)
            seen.setdefault(key, {})[q['mQuestLv']] = level
    return {k: (v[min(v)] if len(v) == 1 else f'{v[min(v)]}–{v[max(v)]}') for k, v in seen.items()}


def build(monster_ids, item_name, title=None):
    """{monster id: {rank: groups}}; groups: carve/tail/mine [{band, rows}], shiny/gather [{slot, rows}],
    capture [{band, rows}], break [{n, band, name, rows}]; a row is [item id, item name, quantity, percent]."""
    review = json.load(open(MV + 'zone-review.json', encoding='utf8'))
    rows = lambda l: [[it, item_name.get(it, str(it)), q, p] for it, q, p in l]
    out, parts_of = {}, {}
    for mid in monster_ids:
        path = ROM + f'arc/enemy/{mid}.arc'
        if not os.path.exists(path):
            continue
        a, ents = mh.arc_entries(path)
        parts_of[mid] = break_parts(a, ents, mid)
        for e in ents:
            if e[1] != mh.thash('rHagi'):
                continue
            s = int(e[0].split(chr(92))[-1][6])
            if s not in RANK:
                continue
            for slot, l in S.hagi_lists(mh.arc_extract(a, e)):
                g = GROUP[S.carve_kind(slot)]
                entry = {'band': slot - BAND_BASE[g]} if g in BAND_BASE else {'slot': slot}
                out.setdefault(mid, {}).setdefault(RANK[s], {}).setdefault(g, []).append({**entry, 'rows': rows(l)})

    def break_name(mid, n):
        """The names of the break's parts as the Parts table shows them (zone-review.json `parts`, the part records Raven
        named in the Monster Viewer; else 'Part N'), joined where a break has several (Rathian 2: Left Wing / Right Wing)."""
        zr = review.get(mid) if isinstance(review.get(mid), dict) else {}
        names = []
        for part in parts_of.get(mid, {}).get(n, []):
            nm = (zr.get('parts') or {}).get(str(part)) or f'Part {part}'
            if nm not in names:
                names.append(nm)
        return ' / '.join(names) or None

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
                    r.setdefault('capture', []).append({'band': band, 'rows': rows(l)})
                else:
                    n = int(label.split()[1])
                    r.setdefault('break', []).append({'n': n, 'band': band, 'name': break_name(mid, n), 'rows': rows(l)})
    # a Deviant's level bands, named by the Special Permit levels that use them
    if title:
        labels = band_labels(title)
        # only a monster with level bands (a Deviant: some group holds more than one band) is labelled -- the plain
        # monsters a Special Permit quest adds (Rathians beside Dreadqueen) share its quests but have no bands
        deviants = {mid for mid, ranks in out.items() for groups in ranks.values() for g, lists in groups.items()
                    if len({l.get('band') for l in lists if 'band' in l}) > 1}
        for mid, ranks in out.items():
            # a Deviant's shiny drop is slot 10 + band (0xac030), 10 + 2 x band for Nightcloak Malfestio, and no band
            # for Redhelm Arzuros (C:/MHGU-Extract/rewards-research/)
            if mid in deviants and mid != 'em060_04':
                for groups in ranks.values():
                    for l in groups.get('shiny', []):
                        step = 2 if mid == 'em079_04' else 1
                        if (l['slot'] - 10) % step == 0:
                            l['band'] = (l['slot'] - 10) // step
            for rank, groups in ranks.items():
                for g, lists in groups.items():
                    for l in lists:
                        if mid in deviants and 'band' in l and (mid, rank, l['band']) in labels:
                            l['levels'] = labels[(mid, rank, l['band'])]
    return out
