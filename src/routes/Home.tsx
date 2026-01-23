import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import type { Deck } from '../db/types'
import { createDeck, deleteDeck, listDecks, renameDeck } from '../db/queries'

function Home() {
  const [decks, setDecks] = useState<Deck[]>([])
  const [newDeckName, setNewDeckName] = useState('')

  const loadDecks = async () => {
    const data = await listDecks()
    setDecks(data)
  }

  useEffect(() => {
    void loadDecks()
  }, [])

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault()
    const name = newDeckName.trim()
    if (!name) {
      return
    }
    await createDeck(name)
    setNewDeckName('')
    await loadDecks()
  }

  const handleRename = async (deck: Deck) => {
    if (!deck.id) {
      return
    }
    const nextName = window.prompt('Nouveau nom du deck', deck.name)
    if (!nextName || !nextName.trim()) {
      return
    }
    await renameDeck(deck.id, nextName.trim())
    await loadDecks()
  }

  const handleDelete = async (deck: Deck) => {
    if (!deck.id) {
      return
    }
    const confirmed = window.confirm(`Supprimer le deck \"${deck.name}\" ?`)
    if (!confirmed) {
      return
    }
    await deleteDeck(deck.id)
    await loadDecks()
  }

  return (
    <main>
      <h1>Home</h1>
      <section>
        <h2>Decks</h2>
        <form onSubmit={handleCreate}>
          <input
            type="text"
            placeholder="Nom du deck"
            value={newDeckName}
            onChange={(event) => setNewDeckName(event.target.value)}
          />
          <button type="submit">Creer</button>
        </form>
        {decks.length === 0 ? (
          <p>Aucun deck pour le moment.</p>
        ) : (
          <ul>
            {decks.map((deck) => (
              <li key={deck.id}>
                <Link to={`/deck/${deck.id}`}>{deck.name}</Link>
                <button type="button" onClick={() => handleRename(deck)}>
                  Renommer
                </button>
                <button type="button" onClick={() => handleDelete(deck)}>
                  Supprimer
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  )
}

export default Home
