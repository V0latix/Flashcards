import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listPacks } from '../supabase/api'
import type { Pack } from '../supabase/types'

function Home() {
  const [packs, setPacks] = useState<Pack[]>([])
  const [packsError, setPacksError] = useState<string | null>(null)

  useEffect(() => {
    const loadPacks = async () => {
      try {
        const data = await listPacks()
        setPacks(data)
      } catch (error) {
        setPacksError((error as Error).message)
      }
    }

    void loadPacks()
  }, [])

  return (
    <main className="container">
      <h1>Home</h1>
      <section className="card section">
        <h2>Pool global</h2>
        <ul>
          <li>
            <Link to="/review">Demarrer la session</Link>
          </li>
          <li>
            <Link to="/library">Library</Link>
          </li>
          <li>
            <Link to="/card/new">Nouvelle carte</Link>
          </li>
          <li>
            <Link to="/stats">Stats</Link>
          </li>
          <li>
            <Link to="/settings">Settings</Link>
          </li>
          <li>
            <Link to="/import-export">Import/Export</Link>
          </li>
        </ul>
      </section>
      <section className="card section">
        <h2>Supabase (test)</h2>
        {packsError ? <p>{packsError}</p> : null}
        {packs.length === 0 ? (
          <p>Aucun pack.</p>
        ) : (
          <ul>
            {packs.map((pack) => (
              <li key={pack.id}>
                {pack.title} ({pack.slug})
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  )
}

export default Home
