import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { loadCombos } from '../data/loaders'
import SearchBox from '../components/SearchBox'
import { useTextScale } from '../theme/textScale'

interface Combo { a: string; b: string; result: string; rate: number; ids: [number, number, number] }

export default function CombosPage() {
  const scale = useTextScale()
  const [combos, setCombos] = useState<Combo[]>([])
  const [q, setQ] = useState('')
  useEffect(() => { loadCombos().then(setCombos) }, [])
  const shown = useMemo(() => {
    const s = q.trim().toLowerCase()
    return s ? combos.filter(c => `${c.a} ${c.b} ${c.result}`.toLowerCase().includes(s)) : combos
  }, [combos, q])
  const item = (name: string, id: number) => <Link to={`/items/${id}`}>{name}</Link>
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <div style={{ padding: '16px 16px 4px' }}>
        <h1 style={{ margin: 0, fontSize: 22 * scale, fontWeight: 700 }}>Combo List</h1>
        <p className="text-muted" style={{ margin: '2px 0 0', fontSize: 13 * scale }}>
          Every combination in the game, with its base success rate.
        </p>
      </div>
      <div style={{ maxWidth: 420 }}><SearchBox value={q} onChange={setQ} placeholder="Search an ingredient or result…" /></div>
      <div style={{ overflowY: 'auto', flex: 1, padding: '8px 16px 16px' }}>
        <table style={{ borderCollapse: 'collapse' }}>
          <thead><tr>
            {['Result', 'Ingredient', 'Ingredient', 'Success'].map((h, i) => <th key={i} className="tbl-header" style={{ textAlign: 'left' }}>{h}</th>)}
          </tr></thead>
          <tbody>
            {shown.map((c, i) => (
              <tr key={i} className="tbl-row">
                <td className="tbl-cell">{item(c.result, c.ids[2])}</td>
                <td className="tbl-cell">{item(c.a, c.ids[0])}</td>
                <td className="tbl-cell">{item(c.b, c.ids[1])}</td>
                <td className="tbl-cell" style={{ textAlign: 'right' }}>{c.rate}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
