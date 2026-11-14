import { useEffect, useMemo, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { loadCanteen, type Canteen, type Dish, type IngredientUnlock } from '../data/loaders'
import ListPage, { DetailHeader, Section } from '../components/ListPage'
import BookmarkButton from '../components/BookmarkButton'
import NotesBox from '../components/NotesBox'
import ItemName from '../components/ItemName'
import { useTextScale } from '../theme/textScale'

const EXPLAINED = 'https://armoredraven17.github.io/mhgu-armor-skills-explained/'

const VIEWS = [
  { value: 'dishes', label: 'Dishes' },
  { value: 'ingredients', label: 'Ingredients' },
  { value: 'skills', label: 'Food Skills' },
]

// The view a route belongs to: /canteen/d<row> (a dish), /canteen/i<id> (an ingredient),
// /canteen/s<skill> (a skill in the Food Skills draw lists), /canteen/skills (that list).
function viewOf(id: string | undefined) {
  if (id === 'skills' || (id && /^s\d+$/.test(id))) return 'skills'
  if (id && /^i\d+$/.test(id)) return 'ingredients'
  if (id && /^d\d+$/.test(id)) return 'dishes'
  return null
}

export default function CanteenPage() {
  const { id } = useParams()
  const [data, setData] = useState<Canteen | null>(null)
  const [view, setView] = useState(viewOf(id) ?? 'dishes')
  useEffect(() => { loadCanteen().then(setData) }, [])
  useEffect(() => { const v = viewOf(id); if (v) setView(v) }, [id])

  const entries = useMemo(() => {
    if (!data) return []
    if (view === 'skills') {
      return foodSkills(data).map(s => ({ key: `s${s.id}`, label: s.skill, group: 'Food Skills', search: s.desc }))
    }
    if (view === 'ingredients') {
      return data.ingredients.map((n, i) => ({ key: `i${i}`, label: n, group: 'Ingredients', sub: unlockHint(data.unlocks[i][0]),
        search: data.unlocks[i].map(unlockHint).join(' ') }))
    }
    return data.dishes.map((d, i) => ({
      key: `d${i}`, label: d.name, group: `Canteen Level ${d.level}`,
      sub: d.ingredients ? d.ingredients.join(' + ') : 'On the menu from the start',
      search: (d.ingredients ?? []).join(' '),
    })).sort((a, b) => a.group.localeCompare(b.group))
  }, [data, view])

  let detail = null
  const kind = viewOf(id)
  const food = data && id?.startsWith('s') ? foodSkills(data).find(s => `s${s.id}` === id) : undefined
  if (food) detail = <FoodSkill skill={food} />
  else if (data && kind === 'dishes' && data.dishes[+id!.slice(1)]) detail = <DishDetail key={id} data={data} row={+id!.slice(1)} />
  else if (data && kind === 'ingredients' && data.ingredients[+id!.slice(1)]) detail = <IngredientDetail key={id} data={data} ing={+id!.slice(1)} />

  const placeholder = view === 'dishes' ? 'Search dishes or ingredients…' : view === 'ingredients' ? 'Search ingredients…' : 'Search…'
  return (
    <ListPage entries={entries} base="/canteen" selected={id} placeholder={placeholder}
              emptyText="Select a dish, an ingredient or a skill." filter={{ value: view, options: VIEWS, onChange: setView }}>
      {detail}
    </ListPage>
  )
}

function Effects({ title, values }: { title: string; values: Record<string, number> }) {
  const shown = Object.entries(values).filter(([, v]) => v)
  if (!shown.length) return null
  return (
    <div>
      <div style={{ fontWeight: 600, marginBottom: 2 }}>{title}</div>
      <table style={{ borderCollapse: 'collapse' }}><tbody>
        {shown.map(([k, v]) => <tr key={k} className="tbl-row"><td className="tbl-cell text-muted">{k}</td><td className="tbl-cell">+{v}</td></tr>)}
      </tbody></table>
    </div>
  )
}

function Odds({ data }: { data: Canteen }) {
  const scale = useTextScale()
  return (
    <p className="text-muted" style={{ margin: '6px 0 0', fontSize: 12 * scale }}>
      Chance each skill activates, by its place in the sauce: {data.odds.map((o, i) =>
        `${['1st', '2nd', '3rd'][i]} ${o.normal}% (chef fired up ${o.fired}%)`).join(' · ')}. A Gourmet Voucher activates all three.
    </p>
  )
}

function DishDetail({ data, row }: { data: Canteen; row: number }) {
  const scale = useTextScale()
  const d: Dish = data.dishes[row]
  const sauces = data.menus[String(d.menu)] ?? []
  const path = `/canteen/d${row}`
  const ingId = (n: string) => data.ingredients.indexOf(n)
  return (
    <div style={{ maxWidth: 820 }}>
      <DetailHeader title={d.name} sub={`Canteen Level ${d.level}`}>
        <BookmarkButton bookmark={{ type: 'dish', id: String(row), name: d.name, path }} />
      </DetailHeader>
      <Section title="Ingredients">
        <p style={{ margin: 0, fontSize: 14 * scale }}>
          {d.ingredients
            ? d.ingredients.map((n, i) => <span key={n}>{i > 0 && ' + '}<Link to={`/canteen/i${ingId(n)}`}>{n}</Link></span>)
            : 'None: on the menu from the start.'}
        </p>
      </Section>
      <Section title="Meal Effects">
        <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap', fontSize: 13 * scale }}>
          <Effects title="Hunter" values={d.hunter} />
          <Effects title="Palico" values={d.palico} />
        </div>
      </Section>
      <Section title="Sauces and Skills">
        <table style={{ borderCollapse: 'collapse' }}>
          <thead><tr>{['Sauce', '1st skill', '2nd skill', '3rd skill'].map(h => <th key={h} className="tbl-header" style={{ textAlign: 'left' }}>{h}</th>)}</tr></thead>
          <tbody>
            {sauces.map((s, i) => (
              <tr key={i} className="tbl-row">
                <td className="tbl-cell" style={{ whiteSpace: 'nowrap' }}>{s.sauce}</td>
                {[0, 1, 2].map(k => <td key={k} className="tbl-cell">{s.skills[k] === 'Food Skills' ? <Link to="/canteen/skills">Food Skills</Link> : s.skills[k] ?? ''}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
        <Odds data={data} />
      </Section>
      <Section title="Notes">
        <NotesBox target={{ type: 'dish', id: String(row), name: d.name, category: 'Canteen dish', path }} />
      </Section>
    </div>
  )
}

function IngredientDetail({ data, ing }: { data: Canteen; ing: number }) {
  const scale = useTextScale()
  const name = data.ingredients[ing]
  const uses = data.dishes.map((d, i) => ({ d, i })).filter(x => x.d.ingredients?.includes(name))
  return (
    <div style={{ maxWidth: 720 }}>
      <DetailHeader title={name} sub="Canteen ingredient" />
      <Section title="How to Get It">
        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 * scale }}>
          {data.unlocks[ing].map((u, i) => <li key={i} style={{ marginBottom: 4 }}><Unlock u={u} /></li>)}
        </ul>
      </Section>
      <Section title={`Dishes (${uses.length})`}>
        <table style={{ borderCollapse: 'collapse' }}>
          <thead><tr>{['Dish', 'With', 'Level'].map(h => <th key={h} className="tbl-header" style={{ textAlign: 'left' }}>{h}</th>)}</tr></thead>
          <tbody>
            {uses.map(({ d, i }) => {
              const other = d.ingredients!.find(n => n !== name) ?? name
              return (
                <tr key={i} className="tbl-row">
                  <td className="tbl-cell"><Link to={`/canteen/d${i}`}>{d.name}</Link></td>
                  <td className="tbl-cell"><Link to={`/canteen/i${data.ingredients.indexOf(other)}`}>{other}</Link></td>
                  <td className="tbl-cell">{d.level}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </Section>
    </div>
  )
}

function unlockHint(u: IngredientUnlock) {
  if (u.kind === 'start') return 'From the start'
  if (u.kind === 'quest') return u.title
  if (u.kind === 'request') return `${u.npc}'s Villager Request`
  return `Talk to the ${u.npc}`
}

function Unlock({ u }: { u: IngredientUnlock }) {
  if (u.kind === 'start') return <>On the list from the start.</>
  if (u.kind === 'talk') return <>Talk to the {u.npc}.</>
  if (u.kind === 'request') {
    return (
      <>Fulfill {u.npc}'s Villager Request:{u.items.map((it, i) => (
        <span key={it.id}>{i > 0 && ', '}<Link to={`/items/${it.id}`}><ItemName name={it.name} id={it.id} /></Link> ×{it.qty}</span>
      ))}.</>
    )
  }
  return (
    <>
      Clear <Link to={`/quests/${u.quest}`}>{u.title}</Link> <span className="text-muted">({u.category} {u.stars})</span>.
    </>
  )
}

// Every skill the two Food Skills draw lists hold, once each, in table order.
function foodSkills(data: Canteen) {
  const seen = new Set<number>()
  return [...data.random, ...data.alcohol].filter(s => !seen.has(s.id) && seen.add(s.id))
}

function FoodSkill({ skill }: { skill: Canteen['random'][number] }) {
  const scale = useTextScale()
  return (
    <div style={{ maxWidth: 720 }}>
      <DetailHeader title={skill.skill} />
      <p style={{ margin: '0 0 8px', color: 'var(--muted)', fontStyle: 'italic', fontSize: 13 * scale, whiteSpace: 'pre-line' }}>{skill.desc}</p>
      {skill.brief && <p style={{ margin: 0, fontSize: 14 * scale }}>{skill.brief}</p>}
      <p style={{ margin: '6px 0 0', fontSize: 12 * scale }}>
        <a href={`${EXPLAINED}#f${skill.id}`} target="_blank" rel="noopener">More detail in MHGU Armor Skills Explained</a>
      </p>
    </div>
  )
}
