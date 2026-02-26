import db from '../db'
import type { Card, ReviewLog, ReviewState } from '../db/types'
import { getDeviceId, createUuid } from '../sync/ids'
import { markLocalChange } from '../sync/queue'
import { LEITNER_BOX_COUNT } from './config'
import { getLeitnerSettings } from './settings'
import { addDays, normalizeToDateKey, normalizeTodayKey } from '../utils/date'

type SessionCard = { card: Card; reviewState: ReviewState }

type DailySession = {
  box1: SessionCard[]
  due: SessionCard[]
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
  const cardById = new Map(
    cards
      .filter((card) => !card.suspended)
      .map((card) => [card.id, card])
  )

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
      ? normalizeTodayKey(todayOrDeckId)
      : normalizeTodayKey(maybeToday ?? '')
  const { box1Target } = getLeitnerSettings()

  await db.transaction('rw', db.cards, db.reviewStates, async () => {
    const box1States = await db.reviewStates.where({ box: 1 }).toArray()
    const box1Cards = await loadCardsByIds(box1States.map((state) => state.card_id))
    const activeBox1Count = box1Cards.filter((card) => !card.suspended).length

    const missing = box1Target - activeBox1Count
    if (missing <= 0) {
      return
    }

    const box0States = await db.reviewStates.where({ box: 0 }).toArray()

    if (box0States.length === 0) {
      return
    }

    const box0CardIds = box0States.map((state) => state.card_id)
    const box0StatesByCardId = new Map(box0States.map((state) => [state.card_id, state]))
    const cards = await loadCardsByIds(box0CardIds)
    const candidateCardIds = cards
      .filter((card) => !card.suspended)
      .map((card) => card.id)
      .filter((id): id is number => typeof id === 'number')

    const selectedCardIds = shuffle(candidateCardIds).slice(0, missing)

    if (selectedCardIds.length === 0) {
      return
    }

    const nowIso = new Date().toISOString()
    await db.reviewStates.bulkPut(
      selectedCardIds.map((cardId) => {
        const current = box0StatesByCardId.get(cardId)
        return {
          ...current,
          card_id: cardId,
          box: 1,
          due_date: today,
          is_learned: false,
          learned_at: null,
          updated_at: nowIso
        }
      })
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
      ? normalizeTodayKey(todayOrDeckId)
      : normalizeTodayKey(maybeToday ?? '')

  await autoFillBox1(today)

  const reviewStates = await db.reviewStates.toArray()
  const { learnedReviewIntervalDays } = getLeitnerSettings()

  const dueStates = reviewStates.filter((state) => {
    if (state.is_learned) {
      return false
    }
    if (state.box < 1) {
      return false
    }
    const dueKey = normalizeToDateKey(state.due_date)
    if (!dueKey) {
      return false
    }
    return dueKey <= today
  })

  const learnedDueStates = reviewStates.filter((state) => {
    if (!state.is_learned || !state.learned_at) {
      return false
    }
    const learnedDate = normalizeToDateKey(state.learned_at)
    if (!learnedDate) {
      return false
    }
    const learnedDueDate = addDays(learnedDate, learnedReviewIntervalDays)
    return learnedDueDate <= today
  })

  const dueStateByCard = new Map<number, ReviewState>()
  for (const state of dueStates) {
    dueStateByCard.set(state.card_id, state)
  }
  for (const state of learnedDueStates) {
    if (!dueStateByCard.has(state.card_id)) {
      dueStateByCard.set(state.card_id, state)
    }
  }

  const dueByBox = new Map<number, ReviewState[]>()
  for (const state of dueStateByCard.values()) {
    const box = state.box ?? 1
    const list = dueByBox.get(box) ?? []
    list.push(state)
    dueByBox.set(box, list)
  }

  const orderedDueStates: ReviewState[] = []
  for (let box = LEITNER_BOX_COUNT; box >= 1; box -= 1) {
    const list = dueByBox.get(box)
    if (list && list.length > 0) {
      list.sort((a, b) => {
        const aDate = a.due_date ?? ''
        const bDate = b.due_date ?? ''
        return aDate.localeCompare(bDate)
      })
      orderedDueStates.push(...list)
    }
  }

  const due = await loadSessionCards(orderedDueStates)

  const box1: SessionCard[] = []

  return { box1, due }
}

export const applyReviewResult = async (
  cardId: number,
  result: 'good' | 'bad',
  todayInput: string,
  wasReversed = false
): Promise<void> => {
  const today = normalizeTodayKey(todayInput)
  const { intervalDays } = getLeitnerSettings()

  await db.transaction('rw', db.reviewStates, db.reviewLogs, async () => {
    const reviewState = await db.reviewStates.get(cardId)
    if (!reviewState) {
      return
    }

    const previousBox = reviewState.box
    const wasLearned = Boolean(reviewState.is_learned)
    const nowIso = new Date().toISOString()
    let nextBox = 1
    let nextDueDate: string | null = addDays(today, 1)
    let nextIsLearned = false
    let nextLearnedAt: string | null = null

    if (result === 'good') {
      if (wasLearned) {
        nextBox = previousBox
        nextDueDate = null
        nextIsLearned = true
        nextLearnedAt = nowIso
      } else {
        nextBox = Math.min(previousBox + 1, LEITNER_BOX_COUNT)
        if (previousBox === LEITNER_BOX_COUNT) {
          nextIsLearned = true
          nextLearnedAt = nowIso
          nextDueDate = null
        } else {
          const interval = intervalDays[nextBox] ?? 1
          nextDueDate = addDays(today, interval)
        }
      }
    } else if (wasLearned) {
      nextBox = 1
      nextDueDate = addDays(today, 1)
      nextIsLearned = false
      nextLearnedAt = null
    }

    await db.reviewStates.update(cardId, {
      box: nextBox,
      due_date: nextDueDate,
      last_reviewed_at: today,
      is_learned: nextIsLearned,
      learned_at: nextLearnedAt,
      updated_at: nowIso
    })

    const logEntry: ReviewLog = {
      card_id: cardId,
      timestamp: nowIso,
      result,
      previous_box: previousBox,
      new_box: nextBox,
      was_learned_before: wasLearned,
      was_reversed: wasReversed,
      client_event_id: createUuid(),
      device_id: getDeviceId()
    }

    await db.reviewLogs.add(logEntry)
  })

  markLocalChange()
}
