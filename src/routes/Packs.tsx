import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listPacks } from '../supabase/api'
import type { Pack } from '../supabase/types'

function Packs() {
  const [packs, setPacks] = useState<Pack[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadPacks = async () => {
      try {
        const data = await listPacks()
        setPacks(data)
      } catch (err) {
        setError((err as Error).message)
      } finally {
        setIsLoading(false)
      }
    }

    void loadPacks()
  }, [])

  return (
    <main className="container">
      <h1>Packs</h1>
      {isLoading ? <p>Chargement...</p> : null}
      {error ? <p>{error}</p> : null}
      {!isLoading && !error && packs.length === 0 ? <p>Aucun pack.</p> : null}
      {!isLoading && !error && packs.length > 0 ? (
        <section className="card section">
          <ul>
            {packs.map((pack) => (
              <li key={pack.id}>
                <h2>{pack.title}</h2>
                <Link className="btn btn-primary" to={`/packs/${pack.slug}`}>
                  Ouvrir
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      <nav>
        <ul>
          <li>
            <Link to="/">Home</Link>
          </li>
        </ul>
      </nav>
    </main>
  )
}

export default Packs
