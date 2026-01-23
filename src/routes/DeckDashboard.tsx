import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getDeckById } from '../db/queries'
import type { Deck } from '../db/types'

function DeckDashboard() {
  const { deckId = 'demo' } = useParams()
  const [deck, setDeck] = useState<Deck | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const numericDeckId = Number(deckId)
  const basePath = `/deck/${deckId}`

  useEffect(() => {
    const loadDeck = async () => {
      if (!Number.isFinite(numericDeckId)) {
        setDeck(null)
        setIsLoading(false)
        return
      }
      const data = await getDeckById(numericDeckId)
      setDeck(data ?? null)
      setIsLoading(false)
    }

    void loadDeck()
  }, [numericDeckId])

  return (
    <main>
      <h1>Deck Dashboard</h1>
      {isLoading ? (
        <p>Chargement...</p>
      ) : deck ? (
        <p>Deck: {deck.name}</p>
      ) : (
        <p>Deck introuvable.</p>
      )}
      <nav>
        <ul>
          <li>
            <Link to="/">Home</Link>
          </li>
          <li>
            <Link to={`${basePath}/review`}>Review session</Link>
          </li>
          <li>
            <Link to={`${basePath}/library`}>Library</Link>
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

export default DeckDashboard
