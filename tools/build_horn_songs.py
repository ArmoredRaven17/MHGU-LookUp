"""The Hunting Horn's songs -> public/data/horn-songs.json (Raven, 2026-11-21: songs per horn and a full song list,
"Follow how the MHFU LookUP app handled it"; "color code the notes"; a horn plays a song when "Every note in its set").

Read from the ROM (the Armor Viewer's C:/MHGU-Extract/add-horn-songs.py traced the same files):
- songs: table/fueMusicScData.fms, n x 5 bytes after the 8-byte header: cFueMusicScBase mTone[0..3] + mMusicInfType.
  The class matches mTone[0] against the newest note played (0x11c63bc), so the play order is mTone[count-1] .. mTone[0].
- names: eng/table/fueMusicInfData_eng.gmd, three strings per song effect (mMusicInfType): name, effect, and the
  effect when the song is played again (shown as 'Encore', the MHFU LookUp's word). '@' = an unused effect.
- note names: build_weapons.NOTE (the Armor Viewer's colour names for the note numbers 1..8).
- note colours: the effect manager's colour slot 1 (loc/arc/resident.arc effect/pec/pec_001), note n = entry n - 1
  (0x11c7b94 ...), decoded by the Armor Viewer into docs/weapons/w12-songs.json `noteColours` (u32, bytes R G B A).
- note icons (Raven, 2026-11-21: "we would want the note icons in place of words"): the game's one note glyph, the
  quaver in the common icon sheet eng/GUI/99_texture/HD_cmn_icon_GSM_NOMIP at x 484..497, y 710..737 (in the 32-pixel
  cell (15, 22) the Collection Tracker's scripts/extract-note-icons.py found), tinted with each note's colour the way
  the item icons are (texel x colour, build_icons.tint) -> public/icons/note/<note>.png.
Durations (table/fueMusicInfData.fmi mFirst / mRepeat / mFirstSkill / mRepeatSkill) are not shown: what each one
times is not traced.
"""
import json
import os
import struct
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from build_weapons import NOTE                   # noqa: E402

SONGS_AV = 'C:/Coding Repos/mhgu-armor-viewer/docs/weapons/w12-songs.json'


NOTE_GLYPH = (478, 708, 510, 740)        # the glyph is x 484..497, y 710..737


def note_slug(name):
    return name.lower().replace(' ', '-')


def build(gmd, rows, write, out_root):
    names = gmd('fueMusicInfData_eng.gmd')
    av = json.load(open(SONGS_AV, encoding='utf8'))['noteColours']
    # '%08x' of the stored u32 reads A B G R
    colour = {NOTE[n]: '#%s%s%s' % (av[n - 1][6:8], av[n - 1][4:6], av[n - 1][2:4]) for n in range(1, 9)}
    songs = []
    for r in rows('fueMusicScData.fms', 5):
        tones = [b for b in r[:4] if b]
        e = r[4]
        if names[3 * e] == '@':
            continue
        songs.append({'notes': [NOTE[t] for t in tones[::-1]], 'name': names[3 * e],
                      'effect': names[3 * e + 1], 'encore': names[3 * e + 2]})
    # the note icons
    import tempfile
    import build_icons
    with tempfile.TemporaryDirectory() as tmp:
        glyph = build_icons.sheet(tmp).convert('RGBA').crop(NOTE_GLYPH)
    os.makedirs(os.path.join(out_root, 'icons', 'note'), exist_ok=True)
    for name, hexc in colour.items():
        v = int(hexc[1:3], 16) | int(hexc[3:5], 16) << 8 | int(hexc[5:7], 16) << 16
        build_icons.tint(glyph, v).save(os.path.join(out_root, 'icons', 'note', note_slug(name) + '.png'))
    write('horn-songs.json', {'colours': colour, 'songs': songs})
    print('  horn songs', len(songs))
