import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import CardEditor from './routes/CardEditor'
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
        <Route path="/review" element={<ReviewSession />} />
        <Route path="/library" element={<Library />} />
        <Route path="/card/new" element={<CardEditor />} />
        <Route path="/card/:cardId/edit" element={<CardEditor />} />
        <Route path="/stats" element={<Stats />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/import-export" element={<ImportExport />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
