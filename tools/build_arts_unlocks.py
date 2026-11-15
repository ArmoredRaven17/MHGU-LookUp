"""How each Hunter Art is learned, read from the ROM (Raven, 2026-11-14: "I would like to add unlock conditions to each").

The game decides it in one function, 0x3eeed0(this, art): a switch on the Art id that returns whether the player
qualifies. The grant 0x3effdc runs at the Arts trainer's pages (talk actions 9-16, 24, 25) and after quests (0x385d98),
and teaches every Art in its list whose check passes (Arts already owned are skipped; owned = bit at +0xd24). The Arts
trainer says the same: "You can learn more Hunter Arts by completing Quests, Villager Requests, and gaining Contribution
Points." (npc_015_td page 106).

The check is run here under the emulator (C:/MHGU-Extract/build/arm/emu.py), once per Art: every global it reads is a
zeroed fake object and every function it calls is stubbed, then each input it consulted is made true alone to see which
one passes. What an input is:
  0x523084(save+0x42c, quest)   the quest is cleared (the talk evaluator's tag 0x0b uses the same call)
  save+0x500 bit N              a progress flag. The ones the Arts test are each set when a quest rank opens, as the
                                villagers announce: 10 / 15 / 24 / 1007 Village 2/3/4/7 stars (npc_002_td pages 31, 40,
                                61, 253: "you can take on 2★ Quests"), 104 / 108 HR 2 / 3 (npc_502_td 35, 46: "promotion
                                to HR 2"), 1400 G1★ (npc_802_td 10: "permission for you to take on G1★ Quests").
  this+0x19..0x1c               completed Villager Requests per village: 0x3f03d0 counts the rActivityData records
                                (resident.arc, 55-byte records; +7 the village 0-3, +53 the completion flag) whose flag
                                is set, kind k into +0x19+k (mask table 0x162b178 = 1, 2, 4, 8)
  0x522dec(save, -1, k)         a village's Contribution Points (the counter the Guild Card medals 37/62/77/92 read at
                                1,000 and 38/63/78/93 at 3,000: "a gift for contributions to Bherna" ...)
  0x5260b4(save+0x72c, key)     the monster's count in the first of the two per-monster tables (the second, at +0x112,
                                is summed with it elsewhere). Taken as Hunts, the Guild Card Monster Log's first column
                                ("Hunts", "Capts"): INFERRED from the order, not traced.
  0x262ab0(obj, bit)            bits a Palico's level-up sets (0x262900): bit 0 at stored level >= 19, bit 1 at >= 24.
                                The stored level counts the rOtLevel thresholds passed from Lv 2, so it is the shown
                                level - 1: Lv 20 and Lv 25.
Arts with no condition are the ones a new save starts with: 0x5213fc ORs them into +0xd24 word by word (read here).
Village names and their order are the Hunter's Notes' (HN_HunternoteMsg_eng 1-4: Bherna, Kokoto, Pokke, Yukumo).
"""
import struct
import sys

sys.path.insert(0, r'C:\MHGU-Extract\build\arm')

CHECK_LO, CHECK_HI = 0x3eeed0, 0x3efe40         # 0x3eeed0 and its cases
NEW_SAVE = (0x521400, 0x521520)                 # the starting Arts are ORed into +0xd24.. here
PALICO_LEVELS = 0x262900                        # bit 0 / bit 1 at these stored levels (cmp immediates)
QUEST, HUNTS, CONTRIB, PALICO = 0x523084, 0x5260b4, 0x522dec, 0x262ab0
OWNED = 0x523320
# save+0x3e0 / +0x3e2: the Village / Hub progress counters. 0x50bf08 rebuilds them from rQuestGroup: a counter reaches
# k once every quest whose mAttribute1 is 0x18+k-1 (Village) / 0x22+k-1 (Hub) is cleared (build_canteen.progress_quests).
COUNTERS = {0x3e0: 'Village', 0x3e2: 'Hub'}
FLAGS = {10: ('village', '2★'), 15: ('village', '3★'), 24: ('village', '4★'), 1007: ('village', '7★'),
         104: ('hr', 2), 108: ('hr', 3), 1400: ('hub', 'G1★')}


def _starting_arts(T, md):
    """Bits ORed into the owned-Arts words +0xd24.. by the new-save setup (movw/movt/add immediates, orr, str)."""
    regs, out = {}, set()
    for i in md.disasm(T[NEW_SAVE[0]:NEW_SAVE[1]], NEW_SAVE[0]):
        o = i.op_str.replace(' ', '').split(',')
        if i.mnemonic == 'movw' and o[1].startswith('#'):
            regs[o[0]] = int(o[1][1:], 0)
        elif i.mnemonic == 'movt' and o[0] in regs:
            regs[o[0]] = (regs[o[0]] & 0xFFFF) | (int(o[1][1:], 0) << 16)
        elif i.mnemonic == 'add' and len(o) == 3 and o[1] in regs and o[2].startswith('#'):
            regs[o[0]] = regs[o[1]] + int(o[2][1:], 0)
        elif i.mnemonic == 'orr' and len(o) == 3 and o[2] in regs:        # orr r0, r0, rN
            regs['orr'] = regs.get('orr', 0) | regs[o[2]]
        elif i.mnemonic == 'orr' and len(o) == 3 and o[2].startswith('#'):  # orr r0, r0, #imm
            regs['orr'] = regs.get('orr', 0) | int(o[2][1:], 0)
        elif i.mnemonic == 'str' and o[1].startswith('[') and o[-1].startswith('#') and 'orr' in regs:
            off, mask = int(o[-1].rstrip(']').lstrip('#'), 0), regs.pop('orr')
            if 0xd24 <= off <= 0xd38:
                out |= {32 * ((off - 0xd24) // 4) + b for b in range(32) if mask >> b & 1}
    return out


def _palico_levels(T, md):
    """The stored levels at which 0x262900 sets bit 0 and bit 1 (shown level = stored + 1)."""
    return [int(i.op_str.split('#')[1], 0) + 1 for i in md.disasm(T[PALICO_LEVELS:PALICO_LEVELS + 0x60], PALICO_LEVELS)
            if i.mnemonic == 'cmp' and i.op_str.startswith('r0, #')][:2]


class _Check:
    """0x3eeed0 under the emulator, with fake globals and stubbed calls."""
    def __init__(self):
        import emu
        from capstone import Cs, CS_ARCH_ARM, CS_MODE_ARM
        from unicorn import UC_HOOK_CODE, UC_HOOK_MEM_READ
        from unicorn.arm_const import UC_ARM_REG_R0, UC_ARM_REG_R1, UC_ARM_REG_R2, UC_ARM_REG_R3, UC_ARM_REG_PC, UC_ARM_REG_LR
        self.R = (UC_ARM_REG_R0, UC_ARM_REG_R1, UC_ARM_REG_R2, UC_ARM_REG_R3)
        T = emu.TEXT
        md = Cs(CS_ARCH_ARM, CS_MODE_ARM)
        md.skipdata = True
        self.T, self.md = T, md
        glob, calls, lits = set(), set(), {}
        for i in md.disasm(T[CHECK_LO:CHECK_HI], CHECK_LO):
            o = i.op_str.replace(' ', '')
            if i.mnemonic == 'ldr' and o.count(',') == 2 and ',[pc,#' in o:
                lits[o.split(',')[0]] = struct.unpack_from('<I', T, i.address + 8 + int(o.split('#')[1].rstrip(']'), 0))[0]
            elif i.mnemonic == 'ldr' and ',[pc,' in o and '#' not in o:
                src = o.split(',')[2].rstrip(']')
                if src in lits:
                    glob.add((i.address + 8 + lits[src]) & 0xFFFFFFFF)
            elif i.mnemonic in ('bl', 'b') and o.startswith('#') and not (CHECK_LO <= int(o[1:], 0) < CHECK_HI):
                calls.add(int(o[1:], 0))
        e = emu.Emu()
        for f in emu.init_array():
            e.call(f)
        self.e, uc = e, e.uc
        BLOCK = 0x20000
        base = e.heap + 0x100000
        self.blocks, self.BLOCK = {}, BLOCK
        for k, g in enumerate(sorted(glob)):          # GOT slot -> variable -> zeroed object
            b = base + k * BLOCK
            self.blocks[b] = g
            uc.mem_write(b, b'\0' * BLOCK)
            e.poke32(base - 0x1000 + 4 * k, b)
            e.poke32(g, base - 0x1000 + 4 * k)
        self.THIS = base + len(glob) * BLOCK
        self.state = {'reads': [], 'calls': [], 'ret': {}}
        st = self.state

        def where(a):
            for b, g in self.blocks.items():
                if b <= a < b + BLOCK:
                    return g, a - b
            if self.THIS <= a < self.THIS + 0x100:
                return 'this', a - self.THIS
            return None

        def on_read(uc_, access, addr, size, value, ud):
            w = where(addr)
            if w and (w, size) not in st['reads']:
                st['reads'].append((w, size))

        def on_call(uc_, addr, size, ud):
            if addr not in calls:
                return
            a = [uc_.reg_read(r) for r in self.R]
            key = (addr, where(a[0]), a[1], a[2])
            st['calls'].append(key)
            uc_.reg_write(UC_ARM_REG_R0, st['ret'].get(key, 0))
            uc_.reg_write(UC_ARM_REG_PC, uc_.reg_read(UC_ARM_REG_LR))

        uc.hook_add(UC_HOOK_MEM_READ, on_read, begin=base, end=self.THIS + 0x100)
        for c in calls:
            uc.hook_add(UC_HOOK_CODE, on_call, begin=c, end=c)

    def run(self, art, ret=None, mem=None):
        uc = self.e.uc
        for b in self.blocks:
            uc.mem_write(b, b'\0' * 0x2000)
        uc.mem_write(self.THIS, b'\0' * 0x100)
        for (g, off), v in (mem or {}).items():
            b = self.THIS if g == 'this' else next(k for k, x in self.blocks.items() if x == g)
            uc.mem_write(b + off, bytes([v]))
        self.state.update(reads=[], calls=[], ret=ret or {})
        r = self.e.call(CHECK_LO, (self.THIS, art))
        if self.e.fault:
            raise RuntimeError(f'art {art}: {self.e.fault}')
        return 1 if r else 0           # a bool, or a tail call's own return (the quest check)

    def least(self, art, make, hi):
        """The smallest value v in 1..hi for which make(v) passes (binary search; the checks are thresholds)."""
        if self.run(art, **make(hi)) != 1:
            return None
        lo = 1
        while lo < hi:
            mid = (lo + hi) // 2
            if self.run(art, **make(mid)) == 1:
                hi = mid
            else:
                lo = mid + 1
        return lo

    def ways(self, art):
        """[(kind, value)] -- each input that alone makes the Art learnable."""
        assert self.run(art) == 0, art
        reads, calls = list(self.state['reads']), [c for c in self.state['calls'] if c[0] != OWNED]
        out = []
        for c in calls:
            n = self.least(art, lambda v, c=c: {'ret': {c: v}}, 20000)
            if n is not None:
                out.append(('call', c, n))
        for (g, off), size in reads:
            if g == 'this':
                n = self.least(art, lambda v, off=off: {'mem': {('this', off): v}}, 255)
                if n is not None:
                    out.append(('count', off, n))
                continue
            if off in COUNTERS:                       # the Village / Hub progress counter: a value test
                n = self.least(art, lambda v, g=g, off=off: {'mem': {(g, off): v}}, 255)
                if n is not None:
                    out.append(('progress', COUNTERS[off], n))
                continue
            for bit in range(8 * size):
                if self.run(art, mem={(g, off + bit // 8): 1 << bit % 8}) == 1:
                    out.append(('flag', (off - 0x500) * 8 + bit))
        return out


def build(names, quest_info, village_names, monster_name, progress):
    """{art id: [way, ...]} for the Arts named in `names` (id -> name). `progress`: {(side, step): [quest numbers]}."""
    chk = _Check()
    start = _starting_arts(chk.T, chk.md)
    pal = _palico_levels(chk.T, chk.md)
    out = {}
    for art in names:
        if art in start:
            out[art] = [{'kind': 'start'}]
            continue
        ways, hunts, flags = [], [], []
        for w in chk.ways(art):
            if w[0] == 'call' and w[1][0] == QUEST:
                q = quest_info.get(w[1][2], {})
                ways.append({'kind': 'quest', 'quest': w[1][2], 'title': q.get('title', str(w[1][2])),
                             'category': q.get('category', ''), 'stars': q.get('stars', '')})
            elif w[0] == 'call' and w[1][0] == HUNTS:
                assert w[2] == 1, w
                hunts.append(monster_name(w[1][2]))
            elif w[0] == 'call' and w[1][0] == CONTRIB:
                ways.append({'kind': 'contribution', 'village': village_names[w[1][3]], 'points': w[2]})
            elif w[0] == 'call' and w[1][0] == PALICO:
                ways.append({'kind': 'palico', 'level': pal[w[1][2]]})
            elif w[0] == 'count':
                ways.append({'kind': 'requests', 'village': village_names[w[1] - 0x19], 'count': w[2]})
            elif w[0] == 'progress':                   # every quest of that counter step, cleared
                qs = [quest_info.get(n, {'id': n, 'title': str(n)}) for n in progress[(w[1], w[2])]]
                qs = [{'quest': q['id'], 'title': q['title'], 'category': q.get('category', ''), 'stars': q.get('stars', '')}
                      for q in qs]
                ways.append({'kind': 'quest', **qs[0]} if len(qs) == 1 else {'kind': 'quests', 'quests': qs})
            elif w[0] == 'flag':
                assert w[1] in FLAGS, f'art {art}: progress flag {w[1]} not read'
                flags.append(FLAGS[w[1]])
            else:
                raise ValueError(f'art {art}: {w}')
        if hunts:
            ways.append({'kind': 'hunt', 'monsters': hunts})
        if flags:
            ways.append({'kind': 'progress', **{k: v for k, v in flags}})
        assert ways, f'art {art} ({names[art]}): no condition read'
        out[art] = ways
    return out
