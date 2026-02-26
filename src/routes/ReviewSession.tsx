import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import db from '../db'
import { applyReviewResult, buildDailySession } from '../leitner/engine'
import { getLeitnerSettings } from '../leitner/settings'
import MarkdownRenderer from '../components/MarkdownRenderer'
import ConfirmDialog from '../components/ConfirmDialog'
import { deleteCard } from '../db/queries'
import { consumeTrainingQueue, TRAINING_QUEUE_KEY } from '../utils/training'
import { useI18n } from '../i18n/useI18n'
import { useAuth } from '../auth/useAuth'
import { supabase } from '../supabase/client'

type SessionCard = {
  cardId: number
  front: string
  back: string
  hint: string | null
  tags: string[]
  wasReversed: boolean
}

const TRAINING_QUEUE_REPLAY_WINDOW_MS = 15_000
const TRAINING_QUEUE_REPLAY_KEY = `${TRAINING_QUEUE_KEY}_replay`
type TrainingReplayPayload = { ids?: unknown; consumedAt?: unknown }
const normalizeTrainingIds = (ids: unknown): number[] => {
  if (!Array.isArray(ids)) {
    return []
  }
  return ids
    .map((id) => Number(id))
    .filter((id) => Number.isFinite(id) && id > 0)
}

const loadTrainingQueue = (): number[] => {
  if (typeof sessionStorage === 'undefined') {
    return []
  }

  const hasPendingQueue = Boolean(sessionStorage.getItem(TRAINING_QUEUE_KEY))

  if (hasPendingQueue) {
    const ids = consumeTrainingQueue()
    sessionStorage.setItem(
      TRAINING_QUEUE_REPLAY_KEY,
      JSON.stringify({ ids, consumedAt: Date.now() })
    )
    return ids
  }

  const replayRaw = sessionStorage.getItem(TRAINING_QUEUE_REPLAY_KEY)
  if (!replayRaw) {
    return []
  }

  try {
    const parsed = JSON.parse(replayRaw) as TrainingReplayPayload
    const replayIds = normalizeTrainingIds(parsed.ids)
    const consumedAt = Number(parsed.consumedAt)
    if (
      replayIds.length > 0 &&
      Number.isFinite(consumedAt) &&
      Date.now() - consumedAt <= TRAINING_QUEUE_REPLAY_WINDOW_MS
    ) {
      return replayIds
    }
  } catch {
    // Ignore malformed replay payload.
  }
  sessionStorage.removeItem(TRAINING_QUEUE_REPLAY_KEY)
  return []
}

function ReviewSession() {
  const { t } = useI18n()
  const { user } = useAuth()
  const today = useMemo(() => new Date().toISOString().slice(0, 10), [])
  const completedSaveKey = useRef<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [cards, setCards] = useState<SessionCard[]>([])
  const [answers, setAnswers] = useState<Record<number, 'good' | 'bad'>>({})
  const [index, setIndex] = useState(0)
  const [showBack, setShowBack] = useState(false)
  const [showHint, setShowHint] = useState(false)
  const [goodCount, setGoodCount] = useState(0)
  const [badCount, setBadCount] = useState(0)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [cardWindowScale, setCardWindowScale] = useState(100)
  const frontMarkdownRef = useRef<HTMLDivElement | null>(null)
  const backMarkdownRef = useRef<HTMLDivElement | null>(null)
  const [searchParams] = useSearchParams()

  const resetScrollTop = (element: HTMLDivElement | null) => {
    if (!element) {
      return
    }
    if (typeof element.scrollTo === 'function') {
      element.scrollTo({ top: 0, left: 0 })
      return
    }
    element.scrollTop = 0
    element.scrollLeft = 0
  }

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
    let isCancelled = false

    const loadSession = async () => {
      setIsLoading(true)
      setCards([])
      setAnswers({})
      setIndex(0)
      setShowBack(false)
      setShowHint(false)
      setGoodCount(0)
      setBadCount(0)
      setIsDeleteOpen(false)
      setIsDeleting(false)

      const { reverseProbability } = getLeitnerSettings()
      let nextCards: SessionCard[] = []

      if (isTraining) {
        const ids = loadTrainingQueue()
        if (ids.length === 0) {
          if (isCancelled) {
            return
          }
          setCards([])
          setIsLoading(false)
          return
        }
        const rawCards = await db.cards.bulkGet(ids)
        const queue = rawCards
          .filter(
            (card): card is NonNullable<typeof card> =>
              Boolean(card?.id) && !card.suspended
          )
          .map((card) => {
            const isReversed = Math.random() < reverseProbability
            return {
              cardId: card.id ?? 0,
              front: isReversed ? card.back_md : card.front_md,
              back: isReversed ? card.front_md : card.back_md,
              hint: card.hint_md ?? null,
              tags: card.tags ?? [],
              wasReversed: isReversed
            }
          })
        nextCards = shuffle(queue)
        if (isCancelled) {
          return
        }
        setCards(nextCards)
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
          hint: entry.card.hint_md ?? null,
          tags: entry.card.tags ?? [],
          wasReversed: isReversed
        }
      })
      const filtered = queue.filter((item) => item.cardId !== 0)
      nextCards = shuffle(filtered)
      if (isCancelled) {
        return
      }
      setCards(nextCards)
      setIsLoading(false)
    }

    void loadSession()
    return () => {
      isCancelled = true
    }
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

  const handleReveal = useCallback(() => {
    setShowBack(true)
  }, [])

  const handleAnswer = useCallback(
    async (result: 'good' | 'bad') => {
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
      setShowHint(false)
      setIndex((prev) => prev + 1)
      if (result === 'good') {
        setGoodCount((prev) => prev + 1)
      } else {
        setBadCount((prev) => prev + 1)
      }
    },
    [currentCard, isTraining, today]
  )

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
    setShowHint(false)
    setIsDeleting(false)
    setIsDeleteOpen(false)
  }

  const isDone = !isLoading && index >= cards.length
  const goodCards = cards.filter((card) => answers[card.cardId] === 'good')
  const badCards = cards.filter((card) => answers[card.cardId] === 'bad')
  const reviewedCount = Math.min(index, cards.length)
  const remainingCount = Math.max(cards.length - index, 0)
  const hasHint = Boolean(currentCard?.hint?.trim())
  const progressPercent =
    cards.length > 0 ? Math.round((reviewedCount / cards.length) * 100) : 0
  const reviewSessionStyle = { '--review-scale': cardWindowScale / 100 } as React.CSSProperties

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

      const target = event.target
      if (target instanceof HTMLElement) {
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

      if (hasHint && event.key.toLowerCase() === 'h') {
        event.preventDefault()
        setShowHint((prev) => !prev)
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
  }, [currentCard, handleAnswer, handleReveal, hasHint, isDeleteOpen, isDone, isLoading, showBack])

  useEffect(() => {
    if (!currentCard) {
      return
    }
    resetScrollTop(frontMarkdownRef.current)
    if (showBack) {
      resetScrollTop(backMarkdownRef.current)
    }
  }, [currentCard, showBack])

  return (
    <main className="container page review-page">
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
        <section className="card section review-session" style={reviewSessionStyle}>
          <div className="review-session-meta">
            {isTraining ? (
              <p className="review-session-mode">{t('review.trainingMode')}</p>
            ) : null}
            {currentCard.tags.length > 0 ? (
              <div className="review-tags" aria-label={t('labels.tags')}>
                <span className="chip">{currentCard.tags.join(' · ')}</span>
              </div>
            ) : null}
            {tagFilter ? <p>{t('library.tag')}: {tagFilter}</p> : null}
          </div>

          <div className="review-progress" aria-label={t('review.progress')}>
            <div className="review-progress-head">
              <p className="review-progress-title">{t('review.progress')}</p>
              <p className="review-progress-count">
                {t('review.remaining', { count: remainingCount })}
              </p>
            </div>
            <div className="review-progress-controls">
              <label className="review-size-label" htmlFor="review-size-slider">
                {t('review.cardSize')}
              </label>
              <input
                id="review-size-slider"
                className="review-size-slider"
                type="range"
                min={90}
                max={130}
                step={5}
                value={cardWindowScale}
                onChange={(event) => setCardWindowScale(Number(event.target.value))}
              />
            </div>
            <div
              className="review-progress-track"
              role="progressbar"
              aria-label={t('review.progress')}
              aria-valuemin={0}
              aria-valuemax={cards.length}
              aria-valuenow={reviewedCount}
            >
              <span
                className="review-progress-fill"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          <div className="review-session-shell">
            <div className={showBack ? 'review-card-stack review-card-stack-revealed' : 'review-card-stack'}>
              <article className="review-face">
                <h2>{t('cardEditor.front')}</h2>
                <div className="markdown" ref={frontMarkdownRef}>
                  <MarkdownRenderer
                    value={currentCard.front || t('status.none')}
                    imageLoading="eager"
                    imageFetchPriority="high"
                  />
                </div>
                {hasHint && showHint ? (
                  <div className="review-hint">
                    <h3>{t('labels.hint')}</h3>
                    <div className="markdown">
                      <MarkdownRenderer
                        value={currentCard.hint ?? t('status.none')}
                        imageLoading="eager"
                        imageFetchPriority="high"
                      />
                    </div>
                  </div>
                ) : null}
              </article>
              {showBack ? (
                <article className="review-face">
                  <h2>{t('cardEditor.back')}</h2>
                  <div className="markdown" ref={backMarkdownRef}>
                    <MarkdownRenderer
                      value={currentCard.back || t('status.none')}
                      imageLoading="eager"
                      imageFetchPriority="high"
                    />
                  </div>
                </article>
              ) : null}
            </div>
            <aside className="review-session-actions">
              {!showBack ? (
                <button type="button" className="btn btn-primary" onClick={handleReveal}>
                  {t('review.revealBack')}
                </button>
              ) : (
                <div className="review-answer-buttons">
                  <button
                    type="button"
                    style={{ order: 1 }}
                    className="btn btn-primary"
                    onClick={() => handleAnswer('good')}
                  >
                    {t('review.good')}
                  </button>
                  <button
                    type="button"
                    style={{ order: 2 }}
                    className="btn btn-secondary"
                    onClick={() => handleAnswer('bad')}
                  >
                    {t('review.bad')}
                  </button>
                </div>
              )}
              {hasHint ? (
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowHint((prev) => !prev)}
                  aria-keyshortcuts="H"
                >
                  {showHint ? t('labels.hideHint') : t('labels.showHint')}
                </button>
              ) : null}
              {showBack ? (
                <Link
                  to={`/card/${currentCard.cardId}/edit`}
                  className="btn btn-secondary"
                >
                  {t('review.editCard')}
                </Link>
              ) : null}
              <button
                type="button"
                className="btn btn-danger"
                onClick={() => setIsDeleteOpen(true)}
              >
                {t('review.deleteCard')}
              </button>
            </aside>
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
