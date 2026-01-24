import { useEffect, useState } from 'react'
import { listPacks } from '../supabase/api'

function DebugSupabase() {
  const [status, setStatus] = useState('En attente...')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const run = async () => {
      try {
        const packs = await listPacks()
        setStatus(`OK (${packs.length} packs)`)
      } catch (err) {
        setError((err as Error).message)
        setStatus('ERREUR')
      }
    }

    void run()
  }, [])

  return (
    <main className="container page">
      <div className="page-header">
        <h1>Debug Supabase</h1>
        <p>Verification simple de lecture.</p>
      </div>
      <section className="card section">
        <p>Status: {status}</p>
        {error ? <p>Erreur: {error}</p> : null}
      </section>
    </main>
  )
}

export default DebugSupabase
