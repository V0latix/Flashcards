import db from '../db'
import type { Card, ReviewLog, ReviewState } from '../db/types'
import { BOX1_TARGET, INTERVAL_DAYS, LEITNER_BOX_COUNT } from './config'

type SessionCard = { card: Card; reviewState: ReviewState }

type DailySession = {
  box1: SessionCard[]
  due: SessionCard[]
}

const toIsoDate = (date: Date): string => date.toISOString().slice(0, 10)

const parseIsoDate = (value: string): Date => {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day))
}

const addDays = (value: string, days: number): string => {
  const date = parseIsoDate(value)
  date.setUTCDate(date.getUTCDate() + days)
  return toIsoDate(date)
}

const normalizeToday = (today: string): string => {
  if (today.length === 10) {
    return today
  }
  return toIsoDate(new Date(today))
}

const loadCardsByIds = async (cardIds: number[]): Promise<Card[]> => {
  if (cardIds.length === 0) {
    return []
  }
  const cards = await db.cards.bulkGet(cardIds)
  return cards.filter((card): card is Card => Boolean(card))
}

const loadSessionCards = async (states: ReviewState[]): Promise<SessionCard[]> => {
  const cards = await loadCardsByIds(states.map((state) => state.card_id))
  const cardById = new Map(cards.map((card) => [card.id, card]))

  return states
    .map((state) => {
      const card = cardById.get(state.card_id)
      return card ? { card, reviewState: state } : null
    })
    .filter((entry): entry is SessionCard => Boolean(entry))
}

const shuffle = <T,>(items: T[]): T[] => {
  const result = [...items]
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

export async function autoFillBox1(today: string): Promise<void>
export async function autoFillBox1(_deckId: number, today: string): Promise<void>
export async function autoFillBox1(
  todayOrDeckId: string | number,
  maybeToday?: string
): Promise<void> {
  const today =
    typeof todayOrDeckId === 'string'
      ? normalizeToday(todayOrDeckId)
      : normalizeToday(maybeToday ?? '')

  await db.transaction('rw', db.cards, db.reviewStates, async () => {
    const box1States = await db.reviewStates.where({ box: 1 }).toArray()

    const missing = BOX1_TARGET - box1States.length
    if (missing <= 0) {
      return
    }

    const box0States = await db.reviewStates.where({ box: 0 }).toArray()

    if (box0States.length === 0) {
      return
    }

    const box0CardIds = box0States.map((state) => state.card_id)
    const cards = await loadCardsByIds(box0CardIds)
    const cardIds = cards.map((card) => card.id)

    const selectedCardIds = shuffle(cardIds).slice(0, missing)

    if (selectedCardIds.length === 0) {
      return
    }

    await db.reviewStates.bulkPut(
      selectedCardIds.map((cardId) => ({
        card_id: cardId,
        box: 1,
        due_date: today
      }))
    )
  })
}

export async function buildDailySession(todayInput: string): Promise<DailySession>
export async function buildDailySession(
  _deckId: number,
  todayInput: string
): Promise<DailySession>
export async function buildDailySession(
  todayOrDeckId: string | number,
  maybeToday?: string
): Promise<DailySession> {
  const today =
    typeof todayOrDeckId === 'string'
      ? normalizeToday(todayOrDeckId)
      : normalizeToday(maybeToday ?? '')

  await autoFillBox1(today)

  const reviewStates = await db.reviewStates.toArray()

  const box1States = reviewStates.filter((state) => state.box === 1)
  const dueStates = reviewStates.filter((state) => {
    if (state.box <= 1) {
      return false
    }
    if (!state.due_date) {
      return false
    }
    return state.due_date <= today
  })

  const [box1, due] = await Promise.all([
    loadSessionCards(box1States),
    loadSessionCards(dueStates)
  ])

  return { box1, due }
}

export const applyReviewResult = async (
  cardId: number,
  result: 'good' | 'bad',
  todayInput: string
): Promise<void> => {
  const today = normalizeToday(todayInput)

  await db.transaction('rw', db.reviewStates, db.reviewLogs, async () => {
    const reviewState = await db.reviewStates.get(cardId)
    if (!reviewState) {
      return
    }

    const previousBox = reviewState.box
    let nextBox = 1
    let nextDueDate = addDays(today, 1)

    if (result === 'good') {
      nextBox = Math.min(previousBox + 1, LEITNER_BOX_COUNT)
      const interval = INTERVAL_DAYS[nextBox] ?? 1
      nextDueDate = addDays(today, interval)
    }

    await db.reviewStates.update(cardId, {
      box: nextBox,
      due_date: nextDueDate,
      last_reviewed_at: today
    })

    const logEntry: ReviewLog = {
      card_id: cardId,
      timestamp: new Date().toISOString(),
      result,
      previous_box: previousBox,
      new_box: nextBox
    }

    await db.reviewLogs.add(logEntry)
  })
}
