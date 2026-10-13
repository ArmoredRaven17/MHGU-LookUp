import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { loadItems } from '../data/loaders'
import type { Item } from '../types'
import ListPage, { DetailHeader, Section } from '../components/ListPage'
import BookmarkButton from '../components/BookmarkButton'
import NotesBox from '../components/NotesBox'
import GameText from '../components/GameText'
import { useTextScale } from '../theme/textScale'

export default function ItemsPage() {
  const { id } = useParams()
  const scale = useTextScale()
  const [items, setItems] = useState<Item[]>([])
  useEffect(() => { loadItems().then(setItems) }, [])

  const entries = useMemo(() => [...items]
    .sort((a, b) => a.name.localeCompare(b.name) || a.id - b.id)
    .map(i => ({ key: String(i.id), label: i.name })), [items])
  const item = items.find(i => String(i.id) === id)
  const path = `/items/${id}`

  return (
    <ListPage entries={entries} base="/items" selected={id} placeholder="Search items…"
              emptyText="Select an item from the list.">
      {item && (
        <div style={{ maxWidth: 640 }}>
          <DetailHeader title={item.name}>
            <BookmarkButton bookmark={{ type: 'item', id: String(item.id), name: item.name, path }} />
          </DetailHeader>
          <Section title="In-Game Description">
            <GameText text={item.desc} style={{ margin: 0, fontSize: 14 * scale }} />
          </Section>
          <Section title="Notes">
            <NotesBox target={{ type: 'item', id: String(item.id), name: item.name, category: 'Item', path }} />
          </Section>
        </div>
      )}
    </ListPage>
  )
}
