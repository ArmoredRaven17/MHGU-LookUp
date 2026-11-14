"""A monster's hit zones as the Monster Viewer's Hit Zones panel shows them (C:/MHGU-Extract/MHGU-Monster-Viewer/docs).

Everything is read from the viewer's own files on each build; nothing is named here:
  hitzones.json        the ROM's damage tables (.dtt: table 0 per slot, then a second block that is a POOL OF ROWS),
                       the slots the body's capsules point at, the .dtt part records (stagger, break, extract)
  zone-review.json     Raven's slot names (`slots`), the slots the chart leaves out (`hide`), the part-record names (`parts`)
  part-review.json     Raven's Parts panel rows (the names a break switch takes) and the level / rage state names
  render/monster.js    ROM_MEAT_SWITCH: which table-1 row each slot takes in which state (read from the ROM by the viewer),
                       ROM_FORM_CLIPS (Alatreon's Form), ROM_HEAT_REGIONS (Agnaktor)
  render/motion-states.js  CLASS_CONTROLS (Chameleos's Invisible, Raging Brachydios's Red Slime)
The page builds the table for the picked state with the viewer's rule (index.html zoneTable -> meatTableFor), so the
rules ship as the viewer has them. Names follow the viewer's: a slot Raven has not named reads "Slot N", a part record
"Part N", a state control the viewer's own label.
"""
import json
import os
import subprocess

MV = 'C:/MHGU-Extract/MHGU-Monster-Viewer/docs/'
HERE = os.path.dirname(os.path.abspath(__file__))
# index.html ATTACHED_ZONE_NAMES: an attached body's slots where its own record names none
ATTACHED_ZONE_NAMES = ['Tentacle Tip', 'Tentacle Middle', 'Tentacle Base']


def _load(f):
    return json.load(open(MV + f, encoding='utf8'))


def _viewer_states():
    out = subprocess.run(['node', os.path.join(HERE, 'viewer_states.cjs'), MV.rstrip('/')],
                         capture_output=True, text=True, encoding='utf8', check=True).stdout
    return json.loads(out)


class Source:
    def __init__(self):
        self.hz = _load('hitzones.json')['monsters']
        self.zrev = _load('zone-review.json')
        self.prev = _load('part-review.json')
        self.groups = {m['id']: m.get('groups') or [] for m in _load('monsters.json')['monsters']}
        st = _viewer_states()
        self.sw, self.forms, self.heat, self.ctl = st['meatSwitch'], st['formClips'], st['heatRegions'], st['classControls']
        self.warnings = []

    def warn(self, mid, msg):
        self.warnings.append(f'{mid}: {msg}')


def _review(src, mid):
    r = src.prev.get(mid)
    return r if isinstance(r, dict) else {}


def _row_parts(key):
    return {int(p) for half in key.split('+') for p in half.split(',') if p.strip().isdigit()}


def _break_name(src, mid, sw, key):
    """index.html zoneBreakParts: the entry's `labels` name, else the Parts panel rows the break's groups fall in."""
    if (sw.get('labels') or {}).get(key):
        return sw['labels'][key]
    rv = _review(src, mid)
    axis = (sw.get('axis') or {}).get(key)
    if axis:                                            # a break an axis row stands for (Gammoth's Tail Fur)
        names = [((rv.get('axes') or {}).get(a) or {}).get('name') for a in axis]
        if all(names):
            return ' & '.join(names)
    groups, rows = src.groups.get(mid, []), (rv.get('rows') or {})
    names = []
    for g in sw['broken'].get(key) or []:
        parts = {p for p, _ in groups[g]} if g < len(groups) else set()
        for k, row in rows.items():
            if parts & _row_parts(k) and row.get('name') and row['name'] not in names:
                names.append(row['name'])
    if names:
        return ' & '.join(names)
    src.warn(mid, f'break "{key}" has no name in the viewer data; left out')
    return None


def _states(src, mid, sw, tables):
    """index.html zoneStates: the control a monster's tables follow, and the viewer's names for its states (the Hit Zones
    panel lists them in its "Damage Table" dropdown). Where the level control owns rage (part-review `levels.rage`) the
    viewer lists nothing and the table follows that control; here its rungs are listed, each with its rage."""
    if not sw:
        if len(tables) > 1:                             # no rules: the viewer offers the two blocks as they are
            return {'axis': 'table', 'names': [f'Table {i}' for i in range(len(tables))]}
        return None
    rules, rv = sw['rules'], _review(src, mid)
    lv = rv.get('levels') if isinstance(rv.get('levels'), dict) else None
    if len(sw.get('modes') or []) > 1:
        return {'axis': 'mode', 'names': [str(m) for m in sw['modes']]}
    if any('ctl' in r for r in rules):
        cc = src.ctl.get(mid)
        if not cc:
            return None
        names = rv.get(cc['reviewNames']) if cc.get('reviewNames') else None
        opt = lambda v, own: str(names[str(v)]) if names and names.get(str(v)) is not None else own
        return {'axis': 'ctl', 'names': [opt(v, own) for v, own in cc['options']], 'values': [v for v, _ in cc['options']]}
    if any('ladder' in r for r in rules):
        rage = rv.get('rage') or {}
        rungs = sorted(int(k) for k in rage if k.isdigit())
        if len(rungs) < 2:
            return None
        return {'axis': 'ladder', 'names': [rage[str(k)] for k in rungs], 'values': rungs}
    if any('rung' in r for r in rules):
        f = lv or src.forms.get(mid)
        if not f or len(f.get('rungs') or []) < 2:
            return None
        return {'axis': 'level', 'names': f['rungs'], 'rage': lv.get('rage') if lv else None}
    if any('rage' in r for r in rules):
        if lv and isinstance(lv.get('rage'), list):     # the level control owns rage: its rung sets it
            return {'axis': 'level', 'names': lv['rungs'], 'rage': lv['rage']}
        ctl = src.ctl.get(mid)
        rage = {} if (ctl and ctl.get('reviewNames') == 'rage') else (rv.get('rage') or {})
        name = lambda k, d: str(rage[k]) if rage.get(k) is not None else d
        return {'axis': 'rage', 'names': [name('0', 'Calm'), name('1', 'Enraged')]}
    return None


def build(src, mid):
    h = src.hz.get(mid)
    if not h:
        return None
    zr = src.zrev.get(mid) if isinstance(src.zrev.get(mid), dict) else {}
    slot_names, hide = zr.get('slots') or {}, zr.get('hide') or {}
    sw = src.sw.get(mid)
    tables = h['tables']
    out = {
        'rows': [{'slot': s, 'name': slot_names.get(str(s)) or f'Slot {s}'}
                 for s in h.get('slotsDefined') or h.get('slotsUsed') or [] if str(s) not in hide],
        'tables': tables,
    }
    # an attached body's own rows (Nakarkos's tentacles): its first table, listed after the body's (zoneChartRows)
    att = next((a for a in (h.get('attached') or {}).values() if a.get('tables')), None)
    if att:
        out['arm'] = {'rows': [{'slot': s, 'name': (att.get('names') or {}).get(str(s))
                                or (ATTACHED_ZONE_NAMES[s] if s < len(ATTACHED_ZONE_NAMES) else f'Tentacle slot {s}')}
                               for s in att.get('slotsDefined') or []],
                      'table': att['tables'][0]}
    st = _states(src, mid, sw, tables)
    if st:
        out['state'] = st
    if sw and len(tables) > 1:
        out['rules'] = sw['rules']
        used = {k for r in sw['rules'] for k in ([r['broken']] if isinstance(r.get('broken'), str) else r.get('broken') or [])
                + ([r['intact']] if isinstance(r.get('intact'), str) else r.get('intact') or [])}
        switches = []
        for key in sw.get('broken') or {}:
            if key not in used:
                continue
            name = _break_name(src, mid, sw, key)
            if name:
                exact = key in (sw.get('exact') or [])
                switches.append({'key': key, 'name': name,
                                 'section': (sw.get('sections') or {}).get(key) or ('' if exact else 'Broken Parts')})
        if switches:
            out['switches'] = switches
        hs = src.heat.get(mid)
        if hs and any('heat' in r for r in sw['rules']):
            out['heat'] = {'beam': hs.get('beam') or []}
    # the .dtt part records the viewer's Parts table lists: those with a stagger or an extract colour (buildPartsChart)
    part_names = zr.get('parts') or {}
    out['parts'] = [{'name': part_names.get(str(i)) or f'Part {i}', 'stagger': p['stagger'], 'break': p['break'],
                     'extract': p['extract']}
                    for i, p in enumerate(h.get('parts') or []) if p and (p.get('stagger') or p.get('extract'))]
    return out
