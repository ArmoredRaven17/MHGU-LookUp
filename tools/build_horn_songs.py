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


def build(gmd, rows, write):
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
    write('horn-songs.json', {'colours': colour, 'songs': songs})
    print('  horn songs', len(songs))
