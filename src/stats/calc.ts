import type { Card, ReviewLog, ReviewState } from '../db/types'
import type { BoxDistribution, DailyReviewAgg, TagAgg } from './types'

const parseDateKey = (value: string): Date => {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day))
}

const toDateKey = (value: string | Date): string => {
  if (typeof value === 'string' && value.length >= 10) {
    return value.slice(0, 10)
  }
  return new Date(value).toISOString().slice(0, 10)
}

const getPeriodKeys = (days: number, todayKey: string): string[] => {
  const keys: string[] = []
  const todayDate = parseDateKey(todayKey)
  for (let i = days - 1; i >= 0; i -= 1) {
    const date = new Date(todayDate)
    date.setUTCDate(todayDate.getUTCDate() - i)
    keys.push(toDateKey(date))
  }
  return keys
}

const addDays = (value: string, days: number): string => {
  const date = parseDateKey(value)
  date.setUTCDate(date.getUTCDate() + days)
  return toDateKey(date)
}

const buildPrefixes = (tags: string[]): string[] => {
  const prefixes = new Set<string>()
  tags.forEach((tag) => {
    const parts = tag
      .split('/')
      .map((part) => part.trim())
      .filter(Boolean)
    if (parts.length === 0) {
      return
    }
    for (let i = 0; i < parts.length; i += 1) {
      prefixes.add(parts.slice(0, i + 1).join('/'))
    }
  })
  return Array.from(prefixes)
}

export type GlobalSummary = {
  totalCards: number
  dueToday: number
  learnedCount: number
  reviewsToday: number
  successRate7d: number | null
}

export const calcGlobalSummary = (
  cards: Card[],
  reviewStates: ReviewState[],
  reviewLogs: ReviewLog[],
  todayKey: string,
  learnedReviewIntervalDays: number
): GlobalSummary => {
  const stateByCard = new Map<number, ReviewState>()
  reviewStates.forEach((state) => stateByCard.set(state.card_id, state))

  let dueToday = 0
  let learnedCount = 0
  reviewStates.forEach((state) => {
    if (state.is_learned) {
      learnedCount += 1
      if (state.learned_at) {
        const learnedDate = toDateKey(new Date(state.learned_at))
        const learnedDue = addDays(learnedDate, learnedReviewIntervalDays)
        if (learnedDue <= todayKey) {
          dueToday += 1
        }
      }
      return
    }
    if (state.box >= 2 && state.due_date && state.due_date <= todayKey) {
      dueToday += 1
    }
  })

  const reviewsToday = reviewLogs.filter(
    (log) => toDateKey(log.timestamp) === todayKey
  ).length

  const sevenDays = getPeriodKeys(7, todayKey)
  const recentLogs = reviewLogs.filter((log) => sevenDays.includes(toDateKey(log.timestamp)))
  const goodLogs = recentLogs.filter((log) => log.result === 'good')
  const successRate7d =
    recentLogs.length === 0
      ? null
      : Number((goodLogs.length / recentLogs.length).toFixed(2))

  return {
    totalCards: cards.length,
    dueToday,
    learnedCount,
    reviewsToday,
    successRate7d
  }
}

export const calcDailyReviews = (
  reviewLogs: ReviewLog[],
  days: 7 | 30 | 90,
  todayKey: string
): DailyReviewAgg[] => {
  const keys = getPeriodKeys(days, todayKey)
  const byDay = new Map<string, { good: number; bad: number }>()
  keys.forEach((key) => byDay.set(key, { good: 0, bad: 0 }))

  reviewLogs.forEach((log) => {
    const key = toDateKey(log.timestamp)
    const entry = byDay.get(key)
    if (!entry) {
      return
    }
    if (log.result === 'good') {
      entry.good += 1
    } else {
      entry.bad += 1
    }
  })

  return keys.map((key) => {
    const entry = byDay.get(key) ?? { good: 0, bad: 0 }
    return {
      date: key,
      good: entry.good,
      bad: entry.bad,
      total: entry.good + entry.bad
    }
  })
}

export const calcBoxDistribution = (reviewStates: ReviewState[]): BoxDistribution => {
  const counts: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  reviewStates.forEach((state) => {
    counts[state.box] = (counts[state.box] ?? 0) + 1
  })
  const total = Object.values(counts).reduce((sum, value) => sum + value, 0)
  return { counts, total }
}

export const calcTagTreeAgg = (
  cards: Card[],
  reviewStates: ReviewState[],
  reviewLogs: ReviewLog[],
  todayKey: string,
  learnedReviewIntervalDays: number
): Record<string, TagAgg> => {
  const stateByCard = new Map<number, ReviewState>()
  reviewStates.forEach((state) => stateByCard.set(state.card_id, state))

  const prefixesByCard = new Map<number, string[]>()
  cards.forEach((card) => {
    if (!card.id) {
      return
    }
    prefixesByCard.set(card.id, buildPrefixes(card.tags))
  })

  const aggMap = new Map<
    string,
    {
      cardIds: Set<number>
      boxSum: number
      dueCount: number
      learnedCount: number
      good: number
      bad: number
    }
  >()

  const ensureAgg = (path: string) => {
    const existing = aggMap.get(path)
    if (existing) {
      return existing
    }
    const created = {
      cardIds: new Set<number>(),
      boxSum: 0,
      dueCount: 0,
      learnedCount: 0,
      good: 0,
      bad: 0
    }
    aggMap.set(path, created)
    return created
  }

  cards.forEach((card) => {
    if (!card.id) {
      return
    }
    const prefixes = prefixesByCard.get(card.id) ?? []
    const state = stateByCard.get(card.id)
    const box = state?.box ?? 0
    const isLearned = Boolean(state?.is_learned)
    let isDue = false
    if (state) {
      if (isLearned && state.learned_at) {
        const learnedDate = toDateKey(new Date(state.learned_at))
        const learnedDue = addDays(learnedDate, learnedReviewIntervalDays)
        isDue = learnedDue <= todayKey
      } else if (state.box >= 2 && state.due_date && state.due_date <= todayKey) {
        isDue = true
      }
    }
    prefixes.forEach((prefix) => {
      const agg = ensureAgg(prefix)
      if (!agg.cardIds.has(card.id)) {
        agg.cardIds.add(card.id)
        agg.boxSum += box
        if (isDue) {
          agg.dueCount += 1
        }
        if (isLearned) {
          agg.learnedCount += 1
        }
      }
    })
  })

  reviewLogs.forEach((log) => {
    const prefixes = prefixesByCard.get(log.card_id) ?? []
    prefixes.forEach((prefix) => {
      const agg = ensureAgg(prefix)
      if (log.result === 'good') {
        agg.good += 1
      } else {
        agg.bad += 1
      }
    })
  })

  const result: Record<string, TagAgg> = {}
  aggMap.forEach((agg, tagPath) => {
    const reviewsTotal = agg.good + agg.bad
    result[tagPath] = {
      tagPath,
      cardsCount: agg.cardIds.size,
      dueCount: agg.dueCount,
      successRate: reviewsTotal === 0 ? null : Number((agg.good / reviewsTotal).toFixed(2)),
      avgBox: agg.cardIds.size === 0 ? 0 : Number((agg.boxSum / agg.cardIds.size).toFixed(2)),
      learnedCount: agg.learnedCount
    }
  })

  return result
}
