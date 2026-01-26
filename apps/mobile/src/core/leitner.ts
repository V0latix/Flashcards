import type { ReviewLog, ReviewState, StoredCard } from '../storage/store'
import { BOX1_TARGET, INTERVAL_DAYS, LEITNER_BOX_COUNT } from './config'

export type ReviewResult = 'good' | 'bad'
export type Rng = () => number

export type LeitnerSettings = {
  box1Target: number
  intervalDays: Record<number, number>
  learnedReviewIntervalDays: number
  reverseProbability: number
}

export type SessionCard = {
  cardId: number
  card: StoredCard
  reviewState: ReviewState
  front: string
  back: string
  wasReversed: boolean
}

export type DailySession = {
  reviewStates: ReviewState[]
  sessionCards: SessionCard[]
  box1: SessionCard[]
  due: SessionCard[]
}

export type ReviewLogInput = Omit<ReviewLog, 'id'>

export const getDefaultLeitnerSettings = (): LeitnerSettings => ({
  box1Target: BOX1_TARGET,
  intervalDays: { ...INTERVAL_DAYS },
  learnedReviewIntervalDays: 90,
  reverseProbability: 0
})

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

const shuffleWithRng = <T,>(items: T[], rng: Rng): T[] => {
  const result = [...items]
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

const buildSessionCards = (
  states: ReviewState[],
  cards: StoredCard[],
  settings: LeitnerSettings,
  rng: Rng
): SessionCard[] => {
  const cardById = new Map(cards.map((card) => [card.id, card]))

  return states
    .map((state) => {
      const card = cardById.get(state.card_id)
      if (!card) {
        return null
      }
      const isReversed = rng() < settings.reverseProbability
      const front = isReversed ? card.back_md : card.front_md
      const back = isReversed ? card.front_md : card.back_md
      return {
        cardId: card.id,
        card,
        reviewState: state,
        front,
        back,
        wasReversed: isReversed
      }
    })
    .filter((entry): entry is SessionCard => Boolean(entry))
}

export const autoFillBox1 = (
  reviewStates: ReviewState[],
  todayInput: string,
  box1Target: number,
  rng: Rng
): ReviewState[] => {
  const today = normalizeToday(todayInput)
  const box1States = reviewStates.filter((state) => state.box === 1)
  const missing = box1Target - box1States.length
  if (missing <= 0) {
    return reviewStates
  }

  const box0States = reviewStates.filter((state) => state.box === 0)
  if (box0States.length === 0) {
    return reviewStates
  }

  const shuffled = shuffleWithRng(box0States, rng)
  const selected = new Set(shuffled.slice(0, missing).map((state) => state.card_id))

  return reviewStates.map((state) => {
    if (!selected.has(state.card_id)) {
      return state
    }
    return {
      ...state,
      box: 1,
      due_date: today
    }
  })
}

export const buildDailySession = (
  cards: StoredCard[],
  reviewStates: ReviewState[],
  todayInput: string,
  settings: LeitnerSettings,
  rng: Rng
): DailySession => {
  const today = normalizeToday(todayInput)
  const nextStates = autoFillBox1(reviewStates, today, settings.box1Target, rng)

  const box1States = nextStates.filter((state) => state.box === 1)
  const dueStates = nextStates.filter((state) => {
    if (state.is_learned) {
      return false
    }
    if (state.box <= 1) {
      return false
    }
    if (!state.due_date) {
      return false
    }
    return state.due_date <= today
  })

  const learnedDueStates = nextStates.filter((state) => {
    if (!state.is_learned || !state.learned_at) {
      return false
    }
    const learnedDate = toIsoDate(new Date(state.learned_at))
    const learnedDueDate = addDays(learnedDate, settings.learnedReviewIntervalDays)
    return learnedDueDate <= today
  })

  const dueStateByCard = new Map<number, ReviewState>()
  dueStates.forEach((state) => {
    dueStateByCard.set(state.card_id, state)
  })
  learnedDueStates.forEach((state) => {
    if (!dueStateByCard.has(state.card_id)) {
      dueStateByCard.set(state.card_id, state)
    }
  })

  const box1 = buildSessionCards(box1States, cards, settings, rng)
  const due = buildSessionCards([...dueStateByCard.values()], cards, settings, rng)
  const sessionCards = shuffleWithRng([...box1, ...due], rng)

  return {
    reviewStates: nextStates,
    sessionCards,
    box1,
    due
  }
}

export const applyReviewResult = (
  reviewState: ReviewState,
  result: ReviewResult,
  todayInput: string,
  settings: LeitnerSettings,
  options?: { nowIso?: string; wasReversed?: boolean }
): { nextState: ReviewState; log: ReviewLogInput } => {
  const today = normalizeToday(todayInput)
  const nowIso = options?.nowIso ?? new Date().toISOString()
  const wasReversed = options?.wasReversed ?? false
  const previousBox = reviewState.box
  const wasLearned = Boolean(reviewState.is_learned)

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
        const interval = settings.intervalDays[nextBox] ?? 1
        nextDueDate = addDays(today, interval)
      }
    }
  } else if (wasLearned) {
    nextBox = 1
    nextDueDate = addDays(today, 1)
    nextIsLearned = false
    nextLearnedAt = null
  }

  const nextState: ReviewState = {
    ...reviewState,
    box: nextBox,
    due_date: nextDueDate,
    last_reviewed_at: today,
    is_learned: nextIsLearned,
    learned_at: nextLearnedAt
  }

  const log: ReviewLogInput = {
    card_id: reviewState.card_id,
    timestamp: nowIso,
    result,
    previous_box: previousBox,
    new_box: nextBox,
    was_learned_before: wasLearned,
    was_reversed: wasReversed
  }

  return { nextState, log }
}
