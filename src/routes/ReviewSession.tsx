import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import db from '../db'
import { applyReviewResult, buildDailySession } from '../leitner/engine'
import { getLeitnerSettings } from '../leitner/settings'
import MarkdownRenderer from '../components/MarkdownRenderer'
import ConfirmDialog from '../components/ConfirmDialog'
import { deleteCard } from '../db/queries'
import { consumeTrainingQueue } from '../utils/training'

function ReviewSession() {
  const today = useMemo(() => new Date().toISOString().slice(0, 10), [])
  const [isLoading, setIsLoading] = useState(true)
  const [cards, setCards] = useState<
    Array<{ cardId: number; front: string; back: string; wasReversed: boolean }>
  >([])
  const [answers, setAnswers] = useState<Record<number, 'good' | 'bad'>>({})
  const [index, setIndex] = useState(0)
  const [showBack, setShowBack] = useState(false)
  const [goodCount, setGoodCount] = useState(0)
  const [badCount, setBadCount] = useState(0)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [searchParams] = useSearchParams()

  const tagFilter = searchParams.get('tag')?.trim() || null
  const isTraining = searchParams.get('mode') === 'training'

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
      const { reverseProbability } = getLeitnerSettings()

      if (isTraining) {
        const ids = consumeTrainingQueue()
        if (ids.length === 0) {
          setCards([])
          setIsLoading(false)
          return
        }
        const rawCards = await db.cards.bulkGet(ids)
        const queue = rawCards
          .filter((card): card is NonNullable<typeof card> => Boolean(card?.id))
          .map((card) => {
            const isReversed = Math.random() < reverseProbability
            return {
              cardId: card.id ?? 0,
              front: isReversed ? card.back_md : card.front_md,
              back: isReversed ? card.front_md : card.back_md,
              wasReversed: isReversed
            }
          })
        setCards(shuffle(queue))
        setIsLoading(false)
        return
      }

      const session = await buildDailySession(today)
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
      setAnswers({})
      setIsLoading(false)
    }

    void loadSession()
  }, [isTraining, tagFilter, today])

  const currentCard = cards[index]

  const handleReveal = () => {
    setShowBack(true)
  }

  const handleAnswer = async (result: 'good' | 'bad') => {
    if (!currentCard) {
      return
    }
    if (!isTraining) {
      await applyReviewResult(currentCard.cardId, result, today, currentCard.wasReversed)
    }
    setAnswers((prev) => ({
      ...prev,
      [currentCard.cardId]: result
    }))
    setShowBack(false)
    setIndex((prev) => prev + 1)
    if (result === 'good') {
      setGoodCount((prev) => prev + 1)
    } else {
      setBadCount((prev) => prev + 1)
    }
  }

  const handleDelete = async () => {
    if (!currentCard || isDeleting) {
      return
    }
    setIsDeleting(true)
    const targetId = currentCard.cardId
    await deleteCard(targetId)
    setCards((prev) => {
      const next = prev.filter((card) => card.cardId !== targetId)
      setIndex((prevIndex) => Math.min(prevIndex, Math.max(0, next.length - 1)))
      return next
    })
    setShowBack(false)
    setIsDeleting(false)
    setIsDeleteOpen(false)
  }

  const isDone = !isLoading && index >= cards.length
  const goodCards = cards.filter((card) => answers[card.cardId] === 'good')
  const badCards = cards.filter((card) => answers[card.cardId] === 'bad')

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
          {isTraining ? (
            <div className="section">
              <h3>Cartes d'entrainement</h3>
              {cards.length === 0 ? (
                <p>Aucune carte.</p>
              ) : (
                <ul className="card-list">
                  {cards.map((card) => (
                    <li key={card.cardId} className="card list-item">
                      <div className="markdown">
                        <MarkdownRenderer value={card.front || '—'} />
                      </div>
                      <div className="markdown">
                        <MarkdownRenderer value={card.back || '—'} />
                      </div>
                      <p>
                        Resultat: {answers[card.cardId] === 'good'
                          ? 'Bon'
                          : answers[card.cardId] === 'bad'
                          ? 'Faux'
                          : '—'}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : (
            <div className="section">
              <div className="split">
                <div className="panel">
                  <h3>Bon</h3>
                  {goodCards.length === 0 ? (
                    <p>Aucune bonne reponse.</p>
                  ) : (
                    <ul className="card-list">
                      {goodCards.map((card) => (
                        <li key={card.cardId} className="card list-item">
                          <div className="markdown">
                            <MarkdownRenderer value={card.front || '—'} />
                          </div>
                          <div className="markdown">
                            <MarkdownRenderer value={card.back || '—'} />
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="panel">
                  <h3>Faux</h3>
                  {badCards.length === 0 ? (
                    <p>Aucune mauvaise reponse.</p>
                  ) : (
                    <ul className="card-list">
                      {badCards.map((card) => (
                        <li key={card.cardId} className="card list-item">
                          <div className="markdown">
                            <MarkdownRenderer value={card.front || '—'} />
                          </div>
                          <div className="markdown">
                            <MarkdownRenderer value={card.back || '—'} />
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          )}
          <Link to="/" className="btn btn-primary">
            Retour a l'accueil
          </Link>
        </section>
      ) : currentCard ? (
        <section className="card section">
          {isTraining ? (
            <p>Mode entrainement (ne modifie pas la progression).</p>
          ) : null}
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
                style={{ order: 2, flex: 1 }}
                className="btn btn-primary"
                onClick={() => handleAnswer('good')}
              >
                Bon
              </button>
              <button
                type="button"
                style={{ order: 1, flex: 1 }}
                className="btn btn-secondary"
                onClick={() => handleAnswer('bad')}
              >
                Faux
              </button>
            </div>
          ) : null}
          <div className="section">
            <button
              type="button"
              className="btn btn-danger"
              onClick={() => setIsDeleteOpen(true)}
            >
              Supprimer la carte
            </button>
          </div>
          <ConfirmDialog
            open={isDeleteOpen}
            title="Suppression"
            message="Supprimer definitivement cette carte ? Cette action est irreversible."
            confirmLabel="Supprimer"
            onConfirm={handleDelete}
            onCancel={() => setIsDeleteOpen(false)}
            isDanger
            confirmDisabled={isDeleting}
          />
        </section>
      ) : (
        <p>{isTraining ? "Aucune carte d'entrainement." : 'Aucune carte a reviser.'}</p>
      )}
    </main>
  )
}

export default ReviewSession
