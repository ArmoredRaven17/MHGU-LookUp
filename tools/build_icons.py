"""Item icons from the ROM -> public/icons/item/<type>-<colour>.png and public/data/item-icons.json.

- The sheet: eng/GUI/99_texture/HD_cmn_icon_GSM_NOMIP in eng/arc/resident_eng.arc, .tex format 7 (RGBA8 in the
  Tegra block-linear layout; decoded with C:/MHGU-Extract/buildlib.py's deswizzler), 512 x 1024, greyscale
  shapes. The 48-pixel copies start at y 416, ten to a row: an item's mIconType n is cell n (itemData.itm
  +16; checked by eye on Antidote 22 flask, Book of Combos 43 book, Ceanataur Hardclaw 10 claw, Bone Scrap 49
  scrap, Bounce Bomb+ 26 barrel bomb, Chilled Meat 4 meat, the ammo 0, and type 46, the '(No Item)'
  placeholder's, the one empty cell in the run). Type 105 (Alchemy Barrel) falls on an empty cell: no icon.
- The colour: itemData.itm +17 mIconCol indexes the table at .data 0x18380d8 (0x55f8b0 / 0x55f9d0; built at
  start-up by the initialiser 0x560bd4, recovered by running the static initialisers in the shared emulator
  C:/MHGU-Extract/build/arm/emu.py). Each entry is 0xAABBGGRR. The icon is drawn as the shape tinted by it
  (texel x colour).

Monster icons -> public/icons/monster/<Monster Viewer id>.png and public/data/monster-icons.json:
- A monster's key is its em number + (variant << 8), small monsters + 0x1000 (the [u32 key, u32 number] table at
  rodata 0x1594ca4, read by 0x50aa8). Its icon cell is the u32 table at rodata 0x1627f98 indexed by that number
  (0x55f818: table[0x50aa8(key)]); the Fatalis numbers (117..119) point at cell 41, the '?' icon.
- Cells 0..97 are on eng/GUI/99_texture/HD_cmn_micon00_BM_MQ_NOMIP (512 x 1024), 98.. on HD_cmn_micon01 (512 x
  512), seven 72-pixel cells to a row (measured on the sheets' empty gutters); both are BC-compressed .tex the shared converter reads.
"""
import json, os, struct, sys

ROM = 'C:/MHGU-ROM/romfs/nativeNX/'
sys.path.insert(0, 'C:/MHGU-RE/offline/decode/lib')
sys.path.insert(0, 'C:/MHGU-Extract')
sys.path.insert(0, 'C:/MHGU-Extract/build/arm')
CELL, TOP, PER_ROW = 48, 416, 10


def sheet(tmp):
    import mh
    import buildlib as B
    bs = chr(92)
    d, ents = mh.arc_entries(ROM + 'eng/arc/resident_eng.arc')
    e = [x for x in ents if x[0] == bs.join(['eng', 'GUI', '99_texture', 'HD_cmn_icon_GSM_NOMIP'])][0]
    path = os.path.join(tmp, 'HD_cmn_icon_GSM_NOMIP.tex')
    open(path, 'wb').write(mh.arc_extract(d, e))
    return B._tex_rgba8_blocklinear(path)


def palette(n):
    import emu
    e = emu.Emu()
    for f in emu.init_array():
        e.call(f)
    p = e.u32(0x18380d8)
    return [e.u32(p + 4 * i) for i in range(n)]


def build(out_root, tmp, names):
    """names: itemData_eng.gmd item names (string 2 x id); the map is by id and by name (material lists name items)."""
    from PIL import Image
    d = open(ROM + 'table/itemData.itm', 'rb').read()
    n = struct.unpack_from('<I', d, 4)[0]
    rows = [(d[8 + 44 * i + 16], d[8 + 44 * i + 17]) for i in range(n)]
    pal = palette(max(c for _, c in rows) + 1)
    im = sheet(tmp)
    folder = os.path.join(out_root, 'icons', 'item')
    os.makedirs(folder, exist_ok=True)
    made, keys = {}, {}
    for i, (t, c) in enumerate(rows):
        key = '%d-%d' % (t, c)
        if key not in made:
            x, y = (t % PER_ROW) * CELL, TOP + (t // PER_ROW) * CELL
            cell = im.crop((x, y, x + CELL, y + CELL))
            if not cell.split()[3].getbbox():
                made[key] = False                      # an empty cell: no icon
                continue
            v = pal[c]
            tint = (v & 255, (v >> 8) & 255, (v >> 16) & 255)
            r, g, b, a = cell.split()
            out = Image.merge('RGBA', [ch.point(lambda p, k=k: p * k // 255) for ch, k in zip((r, g, b), tint)] + [a])
            out.save(os.path.join(folder, key + '.png'), optimize=True)
            made[key] = True
        if made[key]:
            keys[i] = key
    by_name = {}
    for i, k in keys.items():
        by_name.setdefault(names[i], k)
    with open(os.path.join(out_root, 'data', 'item-icons.json'), 'w', encoding='utf8') as f:
        json.dump({'byId': keys, 'byName': by_name}, f, ensure_ascii=False, separators=(',', ':'))
    print('  item icons', sum(made.values()), 'images for', len(keys), 'items')


def monster_icons(out_root, tmp, monster_ids):
    """monster_ids: the Monsters tab's ids (em001_00, ems001_00); each found in the ROM's table gets an icon."""
    import re
    import mh
    import buildlib as B
    from PIL import Image
    bs = chr(92)
    ro = open('C:/MHGU-ROM/exefs/main.rodata', 'rb').read()
    num = {k: s for k, s in (struct.unpack_from('<II', ro, 0x1594ca4 - 0x13EF000 + 8 * i) for i in range(0x89))}
    cell = lambda n: struct.unpack_from('<I', ro, 0x1627f98 - 0x13EF000 + 4 * n)[0]
    d, ents = mh.arc_entries(ROM + 'eng/arc/resident_eng.arc')
    sheets = []
    for short in ('HD_cmn_micon00_BM_MQ_NOMIP', 'HD_cmn_micon01_BM_MQ_NOMIP'):
        e = [x for x in ents if x[0] == bs.join(['eng', 'GUI', '99_texture', short])][0]
        path = os.path.join(tmp, short + '.tex')
        open(path, 'wb').write(mh.arc_extract(d, e))
        sheets.append(Image.open(B.tex_to_dds(path)).convert('RGBA'))
    folder = os.path.join(out_root, 'icons', 'monster')
    os.makedirs(folder, exist_ok=True)
    pitch = 72                                       # 72-pixel cells (transparent 2-pixel rims), from 0
    out = {}
    for mid in monster_ids:
        g = re.match(r'em(s?)(\d+)_(\d+)$', mid)
        key = int(g[2]) + (int(g[3]) << 8) + (0x1000 if g[1] else 0)
        if key not in num:
            continue
        c = cell(num[key])
        sheet, c = (sheets[0], c) if c < 98 else (sheets[1], c - 98)
        x, y = (c % 7) * pitch, (c // 7) * pitch
        sheet.crop((x, y, x + 72, y + 72)).save(os.path.join(folder, mid + '.png'), optimize=True)
        out[mid] = mid
    with open(os.path.join(out_root, 'data', 'monster-icons.json'), 'w', encoding='utf8') as f:
        json.dump(out, f, separators=(',', ':'))
    print('  monster icons', len(out), 'of', len(monster_ids))
