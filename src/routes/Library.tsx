import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { deleteCard, listCardsWithReviewState } from '../db/queries'
import type { Card, ReviewState } from '../db/types'

function Library() {
  const { deckId = 'demo' } = useParams()
  const [cards, setCards] = useState<Array<{ card: Card; reviewState?: ReviewState }>>([])
  const [isLoading, setIsLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [boxFilter, setBoxFilter] = useState('all')
  const [tagFilter, setTagFilter] = useState('')
  const numericDeckId = Number(deckId)
  const basePath = `/deck/${deckId}`

  const loadCards = async () => {
    if (!Number.isFinite(numericDeckId)) {
      setCards([])
      setIsLoading(false)
      return
    }
    const data = await listCardsWithReviewState(numericDeckId)
    setCards(data)
    setIsLoading(false)
  }

  useEffect(() => {
    void loadCards()
  }, [numericDeckId])

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

  const filteredCards = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    const normalizedTag = tagFilter.trim().toLowerCase()

    return cards.filter(({ card, reviewState }) => {
      if (boxFilter !== 'all') {
        if (!reviewState || reviewState.box !== Number(boxFilter)) {
          return false
        }
      }

      if (normalizedQuery) {
        const haystack = `${card.front_md} ${card.back_md}`.toLowerCase()
        if (!haystack.includes(normalizedQuery)) {
          return false
        }
      }

      if (normalizedTag) {
        const tags = card.tags.map((tag) => tag.toLowerCase())
        if (!tags.some((tag) => tag.includes(normalizedTag))) {
          return false
        }
      }

      return true
    })
  }, [boxFilter, cards, query, tagFilter])

  return (
    <main>
      <h1>Library</h1>
      <p>Deck: {deckId}</p>
      <p>
        <Link to={`${basePath}/card/new`}>Ajouter une carte</Link>
      </p>
      <section>
        <label htmlFor="search">Recherche</label>
        <input
          id="search"
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <label htmlFor="box-filter">Box</label>
        <select
          id="box-filter"
          value={boxFilter}
          onChange={(event) => setBoxFilter(event.target.value)}
        >
          <option value="all">Toutes</option>
          <option value="0">0</option>
          <option value="1">1</option>
          <option value="2">2</option>
          <option value="3">3</option>
          <option value="4">4</option>
          <option value="5">5</option>
        </select>
        <label htmlFor="tag-filter">Tag</label>
        <input
          id="tag-filter"
          type="text"
          placeholder="ex: math"
          value={tagFilter}
          onChange={(event) => setTagFilter(event.target.value)}
        />
      </section>
      {isLoading ? (
        <p>Chargement...</p>
      ) : filteredCards.length === 0 ? (
        <p>Aucune carte pour le moment.</p>
      ) : (
        <ul>
          {filteredCards.map(({ card, reviewState }) => (
            <li key={card.id}>
              <Link to={`${basePath}/card/${card.id}/edit`}>
                {card.front_md || 'Carte sans titre'}
              </Link>{' '}
              <span>
                Box {reviewState?.box ?? 0} · Due{' '}
                {reviewState?.due_date ?? '—'}
              </span>
              <button type="button" onClick={() => handleDelete(card)}>
                Supprimer
              </button>
            </li>
          ))}
        </ul>
      )}
      <nav>
        <ul>
          <li>
            <Link to="/">Home</Link>
          </li>
          <li>
            <Link to={basePath}>Deck dashboard</Link>
          </li>
          <li>
            <Link to={`${basePath}/review`}>Review session</Link>
          </li>
          <li>
            <Link to={`${basePath}/card/new`}>New card</Link>
          </li>
          <li>
            <Link to={`${basePath}/stats`}>Stats</Link>
          </li>
          <li>
            <Link to={`${basePath}/settings`}>Settings</Link>
          </li>
          <li>
            <Link to={`${basePath}/import-export`}>Import/Export</Link>
          </li>
        </ul>
      </nav>
    </main>
  )
}

export default Library
