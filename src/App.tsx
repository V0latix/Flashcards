import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import CardEditor from './routes/CardEditor'
import DeckDashboard from './routes/DeckDashboard'
import Home from './routes/Home'
import ImportExport from './routes/ImportExport'
import Library from './routes/Library'
import ReviewSession from './routes/ReviewSession'
import Settings from './routes/Settings'
import Stats from './routes/Stats'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/deck/:deckId" element={<DeckDashboard />} />
        <Route path="/deck/:deckId/review" element={<ReviewSession />} />
        <Route path="/deck/:deckId/library" element={<Library />} />
        <Route path="/deck/:deckId/card/new" element={<CardEditor />} />
        <Route path="/deck/:deckId/card/:cardId/edit" element={<CardEditor />} />
        <Route path="/deck/:deckId/stats" element={<Stats />} />
        <Route path="/deck/:deckId/settings" element={<Settings />} />
        <Route path="/deck/:deckId/import-export" element={<ImportExport />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
