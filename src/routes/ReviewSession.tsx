import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { applyReviewResult, buildDailySession } from '../leitner/engine'

function ReviewSession() {
  const today = useMemo(() => new Date().toISOString().slice(0, 10), [])
  const [isLoading, setIsLoading] = useState(true)
  const [cards, setCards] = useState<
    Array<{ cardId: number; front: string; back: string }>
  >([])
  const [index, setIndex] = useState(0)
  const [showBack, setShowBack] = useState(false)
  const [goodCount, setGoodCount] = useState(0)
  const [badCount, setBadCount] = useState(0)

  const shuffle = <T,>(input: T[]): T[] => {
    const result = [...input]
    for (let i = result.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[result[i], result[j]] = [result[j], result[i]]
    }
    return result
  }

  useEffect(() => {
    const loadSession = async () => {
      const session = await buildDailySession(today)
      const queue = [...session.box1, ...session.due].map((entry) => ({
        cardId: entry.card.id ?? 0,
        front: entry.card.front_md,
        back: entry.card.back_md
      }))
      const filtered = queue.filter((item) => item.cardId !== 0)
      setCards(shuffle(filtered))
      setIsLoading(false)
    }

    void loadSession()
  }, [today])

  const currentCard = cards[index]

  const handleReveal = () => {
    setShowBack(true)
  }

  const handleAnswer = async (result: 'good' | 'bad') => {
    if (!currentCard) {
      return
    }
    await applyReviewResult(currentCard.cardId, result, today)
    setShowBack(false)
    setIndex((prev) => prev + 1)
    if (result === 'good') {
      setGoodCount((prev) => prev + 1)
    } else {
      setBadCount((prev) => prev + 1)
    }
  }

  const isDone = !isLoading && index >= cards.length

  return (
    <main>
      <h1>Review Session</h1>
      {isLoading ? (
        <p>Chargement...</p>
      ) : isDone ? (
        <section>
          <h2>Session terminee</h2>
          <p>
            Total: {cards.length} · Bon: {goodCount} · Faux: {badCount}
          </p>
          <Link to="/">Retour a l'accueil</Link>
        </section>
      ) : currentCard ? (
        <section>
          <p>
            Carte {index + 1} / {cards.length}
          </p>
          <div>
            <h2>Recto</h2>
            <p>{currentCard.front || '—'}</p>
          </div>
          {showBack ? (
            <div>
              <h2>Verso</h2>
              <p>{currentCard.back || '—'}</p>
            </div>
          ) : (
            <button type="button" onClick={handleReveal}>
              Revealer le verso
            </button>
          )}
          {showBack ? (
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'space-between' }}>
              <button
                type="button"
                style={{ order: 1, flex: 1 }}
                onClick={() => handleAnswer('bad')}
              >
                Faux
              </button>
              <button
                type="button"
                style={{ order: 2, flex: 1 }}
                onClick={() => handleAnswer('good')}
              >
                Bon
              </button>
            </div>
          ) : null}
        </section>
      ) : (
        <p>Aucune carte a reviser.</p>
      )}
    </main>
  )
}

export default ReviewSession
