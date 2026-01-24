import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { listPublicCardsByPackSlug } from '../supabase/api'
import { importPackToLocal } from '../supabase/import'
import type { PublicCard } from '../supabase/types'

function PackDetail() {
  const { slug } = useParams()
  const [cards, setCards] = useState<PublicCard[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [importStatus, setImportStatus] = useState<string | null>(null)
  const [isImporting, setIsImporting] = useState(false)

  useEffect(() => {
    const loadCards = async () => {
      if (!slug) {
        setIsLoading(false)
        return
      }
      try {
        const data = await listPublicCardsByPackSlug(slug)
        setCards(data)
      } catch (err) {
        setError((err as Error).message)
      } finally {
        setIsLoading(false)
      }
    }

    void loadCards()
  }, [slug])

  const filteredCards = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (!normalized) {
      return cards
    }
    return cards.filter((card) => {
      const haystack = `${card.front_md} ${card.back_md}`.toLowerCase()
      return haystack.includes(normalized)
    })
  }, [cards, query])

  return (
    <main className="container">
      <h1>Pack</h1>
      <p>Slug: {slug}</p>
      <button
        type="button"
        className="btn btn-primary"
        disabled={isImporting || !slug}
        onClick={async () => {
          if (!slug) {
            return
          }
          setIsImporting(true)
          setImportStatus(null)
          try {
            const result = await importPackToLocal(slug)
            setImportStatus(
              `${result.imported} cartes importees, ${result.alreadyPresent} deja presentes`
            )
          } catch (err) {
            setImportStatus((err as Error).message)
          } finally {
            setIsImporting(false)
          }
        }}
      >
        Importer ce pack dans ma bibliotheque
      </button>
      {importStatus ? <p>{importStatus}</p> : null}
      <section className="card section">
        <label htmlFor="search">Recherche</label>
        <input
          id="search"
          type="text"
          value={query}
          className="input"
          onChange={(event) => setQuery(event.target.value)}
        />
      </section>
      {isLoading ? <p>Chargement...</p> : null}
      {error ? <p>{error}</p> : null}
      {!isLoading && !error ? (
        <section className="card section">
          <p>Total: {filteredCards.length}</p>
          {filteredCards.length === 0 ? (
            <p>Aucune carte.</p>
          ) : (
            <ul>
              {filteredCards.map((card) => (
                <li key={card.id}>
                  <p>Front: {card.front_md}</p>
                  <p>Back: {card.back_md}</p>
                  <p>Tags: {card.tags?.join(', ') || '—'}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}
      <nav>
        <ul>
          <li>
            <Link to="/packs">Retour aux packs</Link>
          </li>
          <li>
            <Link to="/">Home</Link>
          </li>
        </ul>
      </nav>
    </main>
  )
}

export default PackDetail
