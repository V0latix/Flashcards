import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import db from '../db'
import { applyReviewResult, buildDailySession } from '../leitner/engine'
import { getLeitnerSettings } from '../leitner/settings'
import MarkdownRenderer from '../components/MarkdownRenderer'
import ConfirmDialog from '../components/ConfirmDialog'
import { deleteCard } from '../db/queries'
import { consumeTrainingQueue } from '../utils/training'
import { useI18n } from '../i18n/useI18n'
import { useAuth } from '../auth/useAuth'
import { supabase } from '../supabase/client'

function ReviewSession() {
  const { t } = useI18n()
  const { user } = useAuth()
  const today = useMemo(() => new Date().toISOString().slice(0, 10), [])
  const completedSaveKey = useRef<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [cards, setCards] = useState<
    Array<{
      cardId: number
      front: string
      back: string
      tags: string[]
      wasReversed: boolean
    }>
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
              tags: card.tags ?? [],
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
          tags: entry.card.tags ?? [],
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
  const nextCard = cards[index + 1]

  const preloadStyle: React.CSSProperties = {
    position: 'absolute',
    left: '-99999px',
    top: 0,
    width: 1,
    height: 1,
    overflow: 'hidden'
  }

  const handleReveal = () => {
    setShowBack(true)
  }

  const handleAnswer = async (result: 'good' | 'bad') => {
    if (!currentCard) {
      return
    }
    if (!isTraining) {
      void applyReviewResult(currentCard.cardId, result, today, currentCard.wasReversed).catch(
        (error) => {
          console.error('applyReviewResult failed', error)
        }
      )
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

  useEffect(() => {
    if (isTraining || !isDone || !user || cards.length === 0) {
      return
    }

    const saveKey = `${user.id}:${today}`
    if (completedSaveKey.current === saveKey) {
      return
    }
    completedSaveKey.current = saveKey

    const saveDoneStatus = async () => {
      const now = new Date().toISOString()
      const { error } = await supabase.from('daily_cards_status').upsert(
        [
          {
            user_id: user.id,
            day: today,
            done: true,
            done_at: now
          }
        ],
        { onConflict: 'user_id,day' }
      )
      if (error) {
        completedSaveKey.current = null
        console.error('daily_cards_status upsert failed', error.message)
        return
      }
      window.dispatchEvent(new Event('daily-status-updated'))
    }

    void saveDoneStatus()
  }, [cards.length, isDone, isTraining, today, user])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat || isLoading || isDone || isDeleteOpen || !currentCard) {
        return
      }

      const target = event.target as HTMLElement | null
      if (target) {
        const tagName = target.tagName.toLowerCase()
        if (tagName === 'input' || tagName === 'textarea' || target.isContentEditable) {
          return
        }
      }

      const isSpace = event.code === 'Space' || event.key === ' ' || event.key === 'Spacebar'
      if (!showBack && isSpace) {
        event.preventDefault()
        handleReveal()
        return
      }

      if (!showBack) {
        return
      }

      if (event.key === 'ArrowLeft') {
        event.preventDefault()
        void handleAnswer('good')
        return
      }

      if (event.key === 'ArrowRight') {
        event.preventDefault()
        void handleAnswer('bad')
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [currentCard, handleAnswer, isDeleteOpen, isDone, isLoading, showBack])

  return (
    <main className="container page">
      <h1>{t('review.title')}</h1>
      {isLoading ? (
        <p>{t('status.loading')}</p>
      ) : isDone ? (
        <section className="card section">
          <h2>{t('review.completed')}</h2>
          <p>
            {t('labels.total')}: {cards.length} · {t('review.good')}: {goodCount} ·{' '}
            {t('review.bad')}: {badCount}
          </p>
          {isTraining ? (
            <div className="section">
              <h3>{t('review.trainingCards')}</h3>
              {cards.length === 0 ? (
                <p>{t('review.empty')}</p>
              ) : (
                <ul className="card-list">
                  {cards.map((card) => (
                    <li key={card.cardId} className="card list-item">
                      <div className="markdown">
                        <MarkdownRenderer value={card.front || t('status.none')} />
                      </div>
                      <div className="markdown">
                        <MarkdownRenderer value={card.back || t('status.none')} />
                      </div>
                      <p>
                        {t('stats.rate')}: {answers[card.cardId] === 'good'
                          ? t('review.good')
                          : answers[card.cardId] === 'bad'
                          ? t('review.bad')
                          : t('status.none')}
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
                  <h3>{t('review.good')}</h3>
                  {goodCards.length === 0 ? (
                    <p>{t('review.noGood')}</p>
                  ) : (
                    <ul className="card-list">
                      {goodCards.map((card) => (
                        <li key={card.cardId} className="card list-item">
                          <div className="markdown">
                            <MarkdownRenderer value={card.front || t('status.none')} />
                          </div>
                          <div className="markdown">
                            <MarkdownRenderer value={card.back || t('status.none')} />
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="panel">
                  <h3>{t('review.bad')}</h3>
                  {badCards.length === 0 ? (
                    <p>{t('review.noBad')}</p>
                  ) : (
                    <ul className="card-list">
                      {badCards.map((card) => (
                        <li key={card.cardId} className="card list-item">
                          <div className="markdown">
                            <MarkdownRenderer value={card.front || t('status.none')} />
                          </div>
                          <div className="markdown">
                            <MarkdownRenderer value={card.back || t('status.none')} />
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
            {t('review.backHome')}
          </Link>
        </section>
      ) : currentCard ? (
        <section className="card section">
          {isTraining ? (
            <p>{t('review.trainingMode')}</p>
          ) : null}
          {currentCard.tags.length > 0 ? (
            <div className="review-tags" aria-label={t('labels.tags')}>
              <span className="chip">
                {currentCard.tags.join(' · ')}
              </span>
            </div>
          ) : null}
          {tagFilter ? <p>{t('library.tag')}: {tagFilter}</p> : null}
          <p>
            {t('labels.card')} {index + 1} / {cards.length}
          </p>
          <div>
            <h2>{t('cardEditor.front')}</h2>
            <div className="markdown">
              <MarkdownRenderer
                value={currentCard.front || t('status.none')}
                imageLoading="eager"
                imageFetchPriority="high"
              />
            </div>
          </div>
          {/* Preload back (KaTeX + images) so reveal is instant. */}
          {!showBack ? (
            <div aria-hidden="true" style={preloadStyle}>
              <div className="markdown">
                <MarkdownRenderer
                  value={currentCard.back || t('status.none')}
                  imageLoading="eager"
                  imageFetchPriority="high"
                />
              </div>
            </div>
          ) : null}
          {showBack ? (
            <div>
              <h2>{t('cardEditor.back')}</h2>
              <div className="markdown">
                <MarkdownRenderer
                  value={currentCard.back || t('status.none')}
                  imageLoading="eager"
                  imageFetchPriority="high"
                />
              </div>
            </div>
          ) : (
            <button type="button" className="btn btn-primary" onClick={handleReveal}>
              {t('review.revealBack')}
            </button>
          )}
          {/* Preload next card (front + back) during current card. */}
          {nextCard ? (
            <div aria-hidden="true" style={preloadStyle}>
              <div className="markdown">
                <MarkdownRenderer
                  value={nextCard.front || t('status.none')}
                  imageLoading="eager"
                  imageFetchPriority="high"
                />
              </div>
              <div className="markdown">
                <MarkdownRenderer
                  value={nextCard.back || t('status.none')}
                  imageLoading="eager"
                  imageFetchPriority="high"
                />
              </div>
            </div>
          ) : null}
          {showBack ? (
            <div className="button-row">
              <button
                type="button"
                style={{ order: 1, flex: 1 }}
                className="btn btn-primary"
                onClick={() => handleAnswer('good')}
              >
                {t('review.good')}
              </button>
              <button
                type="button"
                style={{ order: 2, flex: 1 }}
                className="btn btn-secondary"
                onClick={() => handleAnswer('bad')}
              >
                {t('review.bad')}
              </button>
            </div>
          ) : null}
          {showBack ? (
            <div className="section">
              <Link
                to={`/card/${currentCard.cardId}/edit`}
                className="btn btn-secondary"
              >
                {t('review.editCard')}
              </Link>
            </div>
          ) : null}
          <div className="section">
            <button
              type="button"
              className="btn btn-danger"
              onClick={() => setIsDeleteOpen(true)}
            >
              {t('review.deleteCard')}
            </button>
          </div>
          <ConfirmDialog
            open={isDeleteOpen}
            title={t('actions.delete')}
            message={t('review.confirmDelete')}
            confirmLabel={t('review.confirmDeleteYes')}
            onConfirm={handleDelete}
            onCancel={() => setIsDeleteOpen(false)}
            isDanger
            confirmDisabled={isDeleting}
          />
        </section>
      ) : (
        <p>{t('review.empty')}</p>
      )}
    </main>
  )
}

export default ReviewSession
