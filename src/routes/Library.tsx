import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { deleteCard, listCardsByDeck } from '../db/queries'
import type { Card } from '../db/types'

function Library() {
  const { deckId = 'demo' } = useParams()
  const [cards, setCards] = useState<Card[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const numericDeckId = Number(deckId)
  const basePath = `/deck/${deckId}`

  const loadCards = async () => {
    if (!Number.isFinite(numericDeckId)) {
      setCards([])
      setIsLoading(false)
      return
    }
    const data = await listCardsByDeck(numericDeckId)
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

  return (
    <main>
      <h1>Library</h1>
      <p>Deck: {deckId}</p>
      <p>
        <Link to={`${basePath}/card/new`}>Ajouter une carte</Link>
      </p>
      {isLoading ? (
        <p>Chargement...</p>
      ) : cards.length === 0 ? (
        <p>Aucune carte pour le moment.</p>
      ) : (
        <ul>
          {cards.map((card) => (
            <li key={card.id}>
              <Link to={`${basePath}/card/${card.id}/edit`}>
                {card.front_md || 'Carte sans titre'}
              </Link>
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
