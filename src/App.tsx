import { useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './auth/AuthProvider'
import db from './db'
import AppShell from './components/AppShell'
import { healthCheckSupabase } from './supabase/health'
import { supabaseClient } from './utils/supabase'
import { useSync } from './sync/useSync'
import CardEditor from './routes/CardEditor'
import Home from './routes/Home'
import ImportExport from './routes/ImportExport'
import Library from './routes/Library'
import PackDetail from './routes/PackDetail'
import Packs from './routes/Packs'
import ReviewSession from './routes/ReviewSession'
import Settings from './routes/Settings'
import StatsPage from './routes/StatsPage'

function SyncGate() {
  useSync()
  return null
}

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

    const runSupabaseCheck = async () => {
      try {
        const { error } = await supabaseClient.from('packs').select('slug').limit(1)
        if (error) {
          console.error('Supabase check error', error.message)
          return
        }
        console.log('Supabase check ok')
      } catch (error) {
        console.error('Supabase check failed', error)
      }
    }

    void runSupabaseCheck()

    if (import.meta.env.DEV) {
      void healthCheckSupabase()
    }
  }, [])

  return (
    <AuthProvider>
      <SyncGate />
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <AppShell>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/review" element={<ReviewSession />} />
            <Route path="/library" element={<Library />} />
            <Route path="/card/new" element={<CardEditor />} />
            <Route path="/card/:cardId/edit" element={<CardEditor />} />
            <Route path="/packs" element={<Packs />} />
            <Route path="/packs/:slug" element={<PackDetail />} />
            <Route path="/stats" element={<StatsPage />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/import-export" element={<ImportExport />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AppShell>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
