import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { applyReviewResult, buildDailySession } from '../leitner/engine'
import { getLeitnerSettings } from '../leitner/settings'
import MarkdownRenderer from '../components/MarkdownRenderer'

function ReviewSession() {
  const today = useMemo(() => new Date().toISOString().slice(0, 10), [])
  const [isLoading, setIsLoading] = useState(true)
  const [cards, setCards] = useState<
    Array<{ cardId: number; front: string; back: string; wasReversed: boolean }>
  >([])
  const [index, setIndex] = useState(0)
  const [showBack, setShowBack] = useState(false)
  const [goodCount, setGoodCount] = useState(0)
  const [badCount, setBadCount] = useState(0)
  const [searchParams] = useSearchParams()

  const tagFilter = searchParams.get('tag')?.trim() || null

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
      const { reverseProbability } = getLeitnerSettings()
      const baseQueue = [...session.box1, ...session.due]
      const filteredQueue = tagFilter
        ? baseQueue.filter((entry) =>
            entry.card.tags.some(
              (tag) => tag === tagFilter || tag.startsWith(`${tagFilter}/`)
            )
          )
        : baseQueue
      const queue = filteredQueue.map((entry) => {
        const isReversed = Math.random() < reverseProbability
        return {
          cardId: entry.card.id ?? 0,
          front: isReversed ? entry.card.back_md : entry.card.front_md,
          back: isReversed ? entry.card.front_md : entry.card.back_md,
          wasReversed: isReversed
        }
      })
      const filtered = queue.filter((item) => item.cardId !== 0)
      setCards(shuffle(filtered))
      setIsLoading(false)
    }

    void loadSession()
  }, [tagFilter, today])

  const currentCard = cards[index]

  const handleReveal = () => {
    setShowBack(true)
  }

  const handleAnswer = async (result: 'good' | 'bad') => {
    if (!currentCard) {
      return
    }
    await applyReviewResult(currentCard.cardId, result, today, currentCard.wasReversed)
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
    <main className="container page">
      <h1>Review Session</h1>
      {isLoading ? (
        <p>Chargement...</p>
      ) : isDone ? (
        <section className="card section">
          <h2>Session terminee</h2>
          <p>
            Total: {cards.length} · Bon: {goodCount} · Faux: {badCount}
          </p>
          <Link to="/" className="btn btn-primary">
            Retour a l'accueil
          </Link>
        </section>
      ) : currentCard ? (
        <section className="card section">
          {tagFilter ? <p>Filtre tag: {tagFilter}</p> : null}
          <p>
            Carte {index + 1} / {cards.length}
          </p>
          <div>
            <h2>Recto</h2>
            <div className="markdown">
              <MarkdownRenderer value={currentCard.front || '—'} />
            </div>
          </div>
          {showBack ? (
            <div>
              <h2>Verso</h2>
              <div className="markdown">
                <MarkdownRenderer value={currentCard.back || '—'} />
              </div>
            </div>
          ) : (
            <button type="button" className="btn btn-primary" onClick={handleReveal}>
              Revealer le verso
            </button>
          )}
          {showBack ? (
            <div className="button-row">
              <button
                type="button"
                style={{ order: 1, flex: 1 }}
                className="btn btn-primary"
                onClick={() => handleAnswer('good')}
              >
                Bon
              </button>
              <button
                type="button"
                style={{ order: 2, flex: 1 }}
                className="btn btn-secondary"
                onClick={() => handleAnswer('bad')}
              >
                Faux
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
