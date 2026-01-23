import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { deleteCard, listCardsWithReviewState } from '../db/queries'
import type { Card, ReviewState } from '../db/types'

function Library() {
  const [cards, setCards] = useState<Array<{ card: Card; reviewState?: ReviewState }>>([])
  const [isLoading, setIsLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [boxFilter, setBoxFilter] = useState('all')
  const [tagFilter, setTagFilter] = useState('')

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
      <p>
        <Link to="/card/new">Ajouter une carte</Link>
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
              <Link to={`/card/${card.id}/edit`}>
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
