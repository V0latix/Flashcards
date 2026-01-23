import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { deleteCard, listCardsWithReviewState } from '../db/queries'
import type { Card, ReviewState } from '../db/types'

function Library() {
  const [cards, setCards] = useState<Array<{ card: Card; reviewState?: ReviewState }>>([])
  const [isLoading, setIsLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'tags' | 'cards'>('tags')
  const [selectedTag, setSelectedTag] = useState<string | null>(null)
  const [query, setQuery] = useState('')

  const loadCards = async () => {
    const data = await listCardsWithReviewState(0)
    setCards(data)
    setIsLoading(false)
  }

  useEffect(() => {
    void loadCards()
  }, [])

  const handleDelete = async (card: Card) => {
    if (!card.id) {
      return
    }
    const confirmed = window.confirm('Supprimer cette carte ?')
    if (!confirmed) {
      return
    }
    await deleteCard(card.id)
    await loadCards()
  }

  const tagsWithCounts = useMemo(() => {
    const counts = new Map<string, number>()
    cards.forEach(({ card }) => {
      card.tags.forEach((tag) => {
        const normalized = tag.trim()
        if (!normalized) {
          return
        }
        counts.set(normalized, (counts.get(normalized) ?? 0) + 1)
      })
    })
    return Array.from(counts.entries())
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => a.tag.localeCompare(b.tag))
  }, [cards])

  const filteredCards = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    return cards.filter(({ card }) => {
      if (selectedTag) {
        const hasTag = card.tags.some((tag) => tag.trim() === selectedTag)
        if (!hasTag) {
          return false
        }
      }

      if (normalizedQuery) {
        const haystack = `${card.front_md} ${card.back_md}`.toLowerCase()
        if (!haystack.includes(normalizedQuery)) {
          return false
        }
      }

      return true
    })
  }, [cards, query, selectedTag])

  const renderSnippet = (value: string) => {
    const trimmed = value.trim()
    if (!trimmed) {
      return 'Carte sans titre'
    }
    return trimmed.length > 80 ? `${trimmed.slice(0, 80)}…` : trimmed
  }

  return (
    <main className="container">
      <h1>Library</h1>
      <p>
        <Link to="/card/new" className="btn btn-primary">
          Ajouter une carte
        </Link>
      </p>
      {isLoading ? (
        <p>Chargement...</p>
      ) : viewMode === 'tags' ? (
        <section className="card section">
          <h2>Tags</h2>
          {tagsWithCounts.length === 0 ? (
            <p>Aucun tag pour le moment.</p>
          ) : (
            <ul>
              {tagsWithCounts.map(({ tag, count }) => (
                <li key={tag}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      setSelectedTag(tag)
                      setViewMode('cards')
                    }}
                  >
                    {tag} ({count})
                  </button>
                </li>
              ))}
            </ul>
          )}
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              setSelectedTag(null)
              setViewMode('cards')
            }}
          >
            Voir toutes les cartes
          </button>
        </section>
      ) : (
        <section className="card section">
          <h2>{selectedTag ? `Tag: ${selectedTag}` : 'Toutes les cartes'}</h2>
          <label htmlFor="search">Recherche</label>
          <input
            id="search"
            type="text"
            value={query}
            className="input"
            onChange={(event) => setQuery(event.target.value)}
          />
          {filteredCards.length === 0 ? (
            <p>Aucune carte pour le moment.</p>
          ) : (
            <ul>
              {filteredCards.map(({ card, reviewState }) => (
                <li key={card.id}>
                  <Link to={`/card/${card.id}/edit`}>
                    {renderSnippet(card.front_md)}
                  </Link>{' '}
                  <span>
                    Box {reviewState?.box ?? 0} · Due{' '}
                    {reviewState?.due_date ?? '—'}
                  </span>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => handleDelete(card)}
                  >
                    Supprimer
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
      <nav>
        <ul>
          <li>
            <Link to="/">Home</Link>
          </li>
          <li>
            <Link to="/review">Review session</Link>
          </li>
          <li>
            <Link to="/library">Library</Link>
          </li>
          <li>
            <Link to="/card/new">New card</Link>
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
      </nav>
    </main>
  )
}

export default Library
