"""Quests, read from the ROM: public/data/quests.json. Called by build_data.py.

Every quest is one packed cQuestData (loc/quest/questData/questData_NNNNNNN.ext), read by the reader the Monster
Viewer work wrote from cQuestData's own property registration (C:/MHGU-RE/offline/decode/lib/questdata.py: field names
mQuestLv, mMonsterLv, mMapNo, mContract, ... and the five boss slots, mEmType's variant in the high byte).
The quests listed are the ones the quest boards list (rQuestGroup, quest/quest_group in loc/arc/village/
common.arc: [u32 quest, u8 attribute 1, u8 attribute 2, u8 mTitleVer]) whose own title is not a placeholder:
1,479. Each quest's text is eng/quest/questData/questData_NNNNNNN_eng.gmd: title, client, description, other
monsters, main objective, failure, subquest.

Columns LOCATED against the Quest Randomizer's QuestData.json (Kiranico-scraped: a check, never a source),
joined by title and type -- `python tools/check_quests.py` re-runs every count:
  category = the quest number's band (number // 10000): 0, 10 Village; 1, 11 Hub; 2, 12, 102, 112 Arena;
             4 Special Permit; 101, 111 Event; 3, 13 Training (not in the Randomizer)
  stars    = mQuestLv: 1..10 = 1..10 stars, 11..14 = G1..G4 stars, 101..116 = Special Permit level 1..16
  rank     = mMonsterLv: 0 Village Low, 1 Low, 3 High, 5 G (named by cOtQuestExpBias); a Village 10-star quest
             at G is the Randomizer's "10-star Advanced"
  locale   = mMapNo -> eng/GUI/06_msg/questMessage_eng.gmd's locale strings (4..28, 114..119; maps 101..104 are
             the night versions, "(N)")
  key      = quest group attribute 1 in 1..24 (the fit; what the byte means is not read)
  objective= the quest text's main objective, as written
Requirements: mEntryType_1 / _2 -> questMessage_eng.gmd string 48 + code (0 "None", "HR n and up", "... only",
  48 "Two players max").
Main monsters: every boss slot's mEmType (the quest's large monsters, targets and the others), named as the
  Monsters tab names them; the Randomizer's targets are among them in every joined quest. Which slots are the
  targets is in mIsClearParam / mClearID (1 = hunt monster N, 3 = all large monsters, ...): not decoded, the
  objective text says it.
Rewards: the quest's link file (loc/quest/questLink/questLink_NNNNNNN.qdl) names five rRem tables, in the order of
  mhgu.db's reward slots A, B, C, D, Sub (rem_000000 = none); each is in loc/arc/quest/qNNNNNNN.arc: f32 1.0, u32 1,
  +8 u8 flag, +9 u8 count, then from +0x18 count x [u16 item, u8 quantity, u8 percent]. Where the flag is 1, the
  table's first item is also a guaranteed reward (mhgu.db lists it at 100%) -- located against mhgu.db, see
  tools/check_quests.py; what flags 2 and 3 mean is not read.
Not read yet: small-monster counts, the boss tables (VitalTblNo etc.).
"""
import os, re, struct, sys

sys.path.insert(0, 'C:/MHGU-RE/offline/decode/lib')
import questdata                          # noqa: E402  (the shared cQuestData reader)
import mh                                 # noqa: E402

COMMON_ARC = 'C:/MHGU-ROM/romfs/nativeNX/loc/arc/village/common.arc'
BAND = {0: 'Village', 10: 'Village', 1: 'Hub', 11: 'Hub', 2: 'Arena', 12: 'Arena', 102: 'Arena', 112: 'Arena',
        4: 'Special Permit', 101: 'Event', 111: 'Event', 3: 'Training', 13: 'Training'}
RANK = {0: 'Village Low Rank', 1: 'Low Rank', 3: 'High Rank', 5: 'G Rank'}
# mMapNo -> questMessage_eng.gmd string (located against the Randomizer's locale names)
MAP = {1: 4, 101: 5, 2: 6, 102: 7, 3: 8, 103: 9, 4: 10, 104: 11, 5: 12, 6: 13, 7: 14, 8: 15, 9: 26, 10: 27,
       11: 16, 12: 19, 13: 17, 14: 18, 15: 28, 16: 21, 17: 20, 18: 24, 19: 22, 20: 23, 21: 25, 22: 114, 23: 115,
       24: 116, 25: 117, 26: 118, 27: 119}


def board():
    d, ents = mh.arc_entries(COMMON_ARC)
    e = [e for e in ents if e[1] == mh.thash('rQuestGroup')][0]
    g = mh.arc_extract(d, e)
    n = struct.unpack_from('<I', g, 4)[0]
    return {struct.unpack_from('<I', g, 8 + 7 * i)[0]: (i,) + struct.unpack_from('<BBB', g, 12 + 7 * i) for i in range(n)}


QUEST_ARC = 'C:/MHGU-ROM/romfs/nativeNX/loc/arc/quest/q%07d.arc'
QUEST_LINK = 'C:/MHGU-ROM/romfs/nativeNX/loc/quest/questLink/questLink_%07d.qdl'
SLOTS = ['A', 'B', 'C', 'D', 'Sub']


def rewards(no, item, flat=None, label=''):
    names = [x.decode() for x in re.findall(rb'rem_[0-9]{6}', open(QUEST_LINK % no, 'rb').read())]
    d, ents = mh.arc_entries(QUEST_ARC % no)
    h = mh.thash('rRem')
    tables = {e[0].split(chr(92))[-1]: e for e in ents if e[1] == h}
    out = []
    for slot, name in zip(SLOTS, names):
        if name == 'rem_000000' or name not in tables:
            continue
        r = mh.arc_extract(d, tables[name])
        flag, n = r[8], r[9]
        ents_ = [struct.unpack_from('<HBB', r, 0x18 + 4 * i) for i in range(n)]
        entry = {'slot': slot, 'items': [[item[i], q, p] for i, q, p in ents_]}
        if flat is not None:
            flat += [(i, label, slot, q, p) for i, q, p in ents_]
        if flag == 1 and ents_ and slot != 'Sub':           # mhgu.db: never on the subquest's table
            entry['guaranteed'] = [item[ents_[0][0]], ents_[0][1]]
        out.append(entry)
    return out


def stars(lv):
    if 101 <= lv <= 116:
        return f'Permit Lv {lv - 100}'
    if 11 <= lv <= 14:
        return f'G{lv - 10}★'
    return f'{lv}★' if lv else ''


def build(gmd_path, write, monster_names, item):
    msg = gmd_path('GUI/06_msg/questMessage_eng.gmd')
    groups = board()
    out, flat = [], []                              # flat: (item id, quest label, slot, quantity, percent)
    for q in questdata.real_quests():
        no = q['mQuestNo']
        t = [x.replace('\r\n', '\n') for x in gmd_path(f'quest/questData/questData_{no:07d}_eng.gmd')]
        t += [''] * (7 - len(t))
        g = groups[no]
        bosses = []
        for b in q['boss']:
            if b['EmType']:
                em = 'em%03d_%02d' % (b['EmType'] & 0xff, b['EmType'] >> 8)
                if [em, monster_names.get(em, em)] not in bosses:
                    bosses.append([em, monster_names.get(em, em)])
        req = [msg[48 + q[k]] for k in ('mEntryType_1', 'mEntryType_2') if q[k] and 48 + q[k] < len(msg)]
        out.append({
            'id': no, 'title': t[0], 'client': t[1], 'desc': t[2], 'others': t[3], 'objective': t[4],
            'failure': t[5], 'subquest': t[6] if t[6] not in ('None', '') else '',
            'category': BAND.get(no // 10000, 'Other'), 'stars': stars(q['mQuestLv']), 'level': q['mQuestLv'],
            'rank': RANK.get(q['mMonsterLv'], ''), 'key': 1 <= g[1] <= 24, 'order': g[0],
            'locale': msg[MAP[q['mMapNo']]] if q['mMapNo'] in MAP else '',
            'time': q['mQuestTime'], 'fee': q['mContract'], 'reward': q['mRemMoney'],
            'hrp': q['mClearRemHuterPoint'], 'subReward': q['mSubRemMoney'], 'subHrp': q['mSubRemHuterPoint'],
            'requirements': req, 'monsters': bosses, 'rewards': rewards(no, item, flat, f"{t[0]} ({BAND.get(no // 10000, 'Other')} {stars(q['mQuestLv'])})".replace(' )', ')')), '_map': q['mMapNo'] % 100,
            '_rankfile': {0: 'low', 1: 'low', 3: 'high', 5: 'g'}.get(q['mMonsterLv']),
        })
    out.sort(key=lambda x: x['order'])
    reachable = {(q.pop('_map'), q.pop('_rankfile')) for q in out}
    write('quests.json', out)
    print('  quests', len(out))
    return reachable, flat
