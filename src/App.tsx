import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import { NAV } from './nav'
import WeaponsPage from './pages/WeaponsPage'
import ArmorPage from './pages/ArmorPage'
import ArmorSkillsPage from './pages/ArmorSkillsPage'
import DecorationsPage from './pages/DecorationsPage'
import StylesPage from './pages/StylesPage'
import HunterArtsPage from './pages/HunterArtsPage'
import ItemsPage from './pages/ItemsPage'
import BookmarksPage from './pages/BookmarksPage'
import NotesPage from './pages/NotesPage'
import SettingsPage from './pages/SettingsPage'
import HelpPage from './pages/HelpPage'
import AboutPage from './pages/AboutPage'
import PlaceholderPage from './pages/PlaceholderPage'

export default function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Navigate to="/weapons" replace />} />
          <Route path="weapons"           element={<WeaponsPage />} />
          <Route path="weapons/:cls"      element={<WeaponsPage />} />
          <Route path="weapons/:cls/:row" element={<WeaponsPage />} />
          <Route path="armor"             element={<ArmorPage />} />
          <Route path="armor/:id"         element={<ArmorPage />} />
          <Route path="armorskills"       element={<ArmorSkillsPage />} />
          <Route path="armorskills/:id"   element={<ArmorSkillsPage />} />
          <Route path="decorations"       element={<DecorationsPage />} />
          <Route path="decorations/:id"   element={<DecorationsPage />} />
          <Route path="styles"            element={<StylesPage />} />
          <Route path="arts"              element={<HunterArtsPage />} />
          <Route path="arts/:id"          element={<HunterArtsPage />} />
          <Route path="items"             element={<ItemsPage />} />
          <Route path="items/:id"         element={<ItemsPage />} />
          <Route path="bookmarks"         element={<BookmarksPage />} />
          <Route path="notes"             element={<NotesPage />} />
          <Route path="settings"          element={<SettingsPage />} />
          <Route path="help"              element={<HelpPage />} />
          <Route path="about"             element={<AboutPage />} />
          {NAV.filter(n => n.soon).map(n => (
            <Route key={n.path} path={n.path} element={<PlaceholderPage label={n.label} />} />
          ))}
          <Route path="*" element={<Navigate to="/weapons" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
