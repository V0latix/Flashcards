import { useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import db from './db'
import { healthCheckSupabase } from './supabase/health'
import CardEditor from './routes/CardEditor'
import Home from './routes/Home'
import ImportExport from './routes/ImportExport'
import Library from './routes/Library'
import PackDetail from './routes/PackDetail'
import Packs from './routes/Packs'
import ReviewSession from './routes/ReviewSession'
import Settings from './routes/Settings'
import Stats from './routes/Stats'

function App() {
  useEffect(() => {
    const runDbCheck = async () => {
      try {
        await db.open()
        const count = await db.cards.count()
        console.log('DB OK, cards=', count)
      } catch (error) {
        console.error('DB ERROR', error)
      }
    }

    void runDbCheck()

    if (import.meta.env.DEV) {
      void healthCheckSupabase()
    }
  }, [])

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/review" element={<ReviewSession />} />
        <Route path="/library" element={<Library />} />
        <Route path="/card/new" element={<CardEditor />} />
        <Route path="/card/:cardId/edit" element={<CardEditor />} />
        <Route path="/packs" element={<Packs />} />
        <Route path="/packs/:slug" element={<PackDetail />} />
        <Route path="/stats" element={<Stats />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/import-export" element={<ImportExport />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
