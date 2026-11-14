// Dumps, as JSON on stdout, the Monster Viewer's tables that decide a monster's hit-zone states
// (render/monster.js ROM_MEAT_SWITCH, ROM_FORM_CLIPS, ROM_HEAT_REGIONS; render/motion-states.js CLASS_CONTROLS).
// Each object literal is cut out of the viewer's source and evaluated alone, so nothing here copies the viewer's data:
// build_data.py reads it fresh on every build. A name the literal uses from elsewhere in its file is stubbed as 0
// (only tooltip text uses one: CLASS_CONTROLS' SLIME_REARM063).
// usage: node viewer_states.cjs <viewer docs dir>
const fs = require('fs')
const DOCS = process.argv[2]

function literal(file, name) {
  const src = fs.readFileSync(DOCS + '/' + file, 'utf8')
  const at = src.indexOf('export const ' + name + ' = {')
  if (at < 0) throw new Error(name + ' not found in ' + file)
  const i = src.indexOf('{', at)
  let depth = 0, q = null
  for (let j = i; j < src.length; j++) {
    const c = src[j]
    if (q) { if (c === '\\') { j++; continue } if (c === q) q = null; continue }
    if (c === '/' && src[j + 1] === '/') { j = src.indexOf('\n', j); continue }
    if (c === '/' && src[j + 1] === '*') { j = src.indexOf('*/', j) + 1; continue }
    if (c === '"' || c === "'" || c === '`') { q = c; continue }
    if (c === '{') depth++
    if (c === '}' && --depth === 0) return evaluate(src.slice(i, j + 1))
  }
  throw new Error(name + ' never closes')
}

function evaluate(text) {
  const stubs = []
  for (;;) {
    try { return new Function(...stubs, 'return (' + text + ')')(...stubs.map(() => 0)) }
    catch (e) {
      const m = e instanceof ReferenceError && /^(\w+) is not defined/.exec(e.message)
      if (!m || stubs.includes(m[1])) throw e
      stubs.push(m[1])
    }
  }
}

const out = {
  meatSwitch: literal('render/monster.js', 'ROM_MEAT_SWITCH'),
  formClips: literal('render/monster.js', 'ROM_FORM_CLIPS'),
  heatRegions: literal('render/monster.js', 'ROM_HEAT_REGIONS'),
  classControls: literal('render/motion-states.js', 'CLASS_CONTROLS'),
}
// keep only what the hit-zone states read (the form machine's control name and rungs, a class control's options)
for (const [id, f] of Object.entries(out.formClips)) out.formClips[id] = { name: f.name, rungs: f.rungs }
for (const [id, c] of Object.entries(out.classControls)) out.classControls[id] = { label: c.label, options: c.options, reviewNames: c.reviewNames }
process.stdout.write(JSON.stringify(out))
