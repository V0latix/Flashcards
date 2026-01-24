import { useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import db from './db'
import AppShell from './components/AppShell'
import { healthCheckSupabase } from './supabase/health'
import CardEditor from './routes/CardEditor'
import DebugMedia from './routes/DebugMedia'
import DebugSupabase from './routes/DebugSupabase'
import Home from './routes/Home'
import ImportExport from './routes/ImportExport'
import Library from './routes/Library'
import PackDetail from './routes/PackDetail'
import Packs from './routes/Packs'
import ReviewSession from './routes/ReviewSession'
import Settings from './routes/Settings'
import StatsPage from './routes/StatsPage'

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
      <AppShell>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/review" element={<ReviewSession />} />
          <Route path="/library" element={<Library />} />
          <Route path="/card/new" element={<CardEditor />} />
          <Route path="/card/:cardId/edit" element={<CardEditor />} />
          <Route path="/debug/media" element={<DebugMedia />} />
          <Route path="/debug/supabase" element={<DebugSupabase />} />
          <Route path="/packs" element={<Packs />} />
          <Route path="/packs/:slug" element={<PackDetail />} />
          <Route path="/stats" element={<StatsPage />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/import-export" element={<ImportExport />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AppShell>
    </BrowserRouter>
  )
}

export default App
