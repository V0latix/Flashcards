import type { Card, ReviewLog, ReviewState } from '../db/types'

type DateKey = string

export type GlobalStats = {
  totalCards: number
  boxCounts: Record<number, number>
  dueToday: number
  reviewsTotal: number
  reviewsToday: number
}

export type DailyReviewStats = {
  date: DateKey
  good: number
  bad: number
  total: number
}

export type TagStat = {
  path: string
  name: string
  cardCount: number
  avgBox: number
  good: number
  bad: number
  reviewsTotal: number
  successRate: number | null
}

export type TagStatsResult = {
  statsByPath: Record<string, TagStat>
  rootTags: string[]
}

export type LeitnerStats = {
  transitions: Array<{ from: number; to: number; count: number }>
  avgDaysToPromote: number | null
  relapseRate: number | null
}

export type CardInsights = {
  neverReviewed: Array<{ id: number; front: string }>
  mostFailed: Array<{ id: number; front: string; fails: number }>
  stuckLowBox: Array<{ id: number; front: string; daysOverdue: number }>
}

const parseDateKey = (value: DateKey): Date => {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day))
}

export const toDateKey = (value: string | Date): DateKey => {
  if (typeof value === 'string' && value.length >= 10) {
    return value.slice(0, 10)
  }
  return new Date(value).toISOString().slice(0, 10)
}

export const getTodayKey = (): DateKey => toDateKey(new Date())

export const getPeriodKeys = (days: number, todayKey: DateKey): DateKey[] => {
  const keys: DateKey[] = []
  const todayDate = parseDateKey(todayKey)
  for (let i = days - 1; i >= 0; i -= 1) {
    const date = new Date(todayDate)
    date.setUTCDate(todayDate.getUTCDate() - i)
    keys.push(toDateKey(date))
  }
  return keys
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

export const calculateGlobalStats = (
  cards: Card[],
  reviewStates: ReviewState[],
  reviewLogs: ReviewLog[],
  todayKey: DateKey
): GlobalStats => {
  const boxCounts: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  const stateByCard = new Map<number, ReviewState>()
  reviewStates.forEach((state) => {
    stateByCard.set(state.card_id, state)
  })

  cards.forEach((card) => {
    if (!card.id) {
      return
    }
    const state = stateByCard.get(card.id)
    const box = state?.box ?? 0
    boxCounts[box] = (boxCounts[box] ?? 0) + 1
  })

  const dueToday = reviewStates.filter(
    (state) => state.box >= 2 && state.due_date && state.due_date <= todayKey
  ).length

  const reviewsTotal = reviewLogs.length
  const reviewsToday = reviewLogs.filter((log) => toDateKey(log.timestamp) === todayKey).length

  return {
    totalCards: cards.length,
    boxCounts,
    dueToday,
    reviewsTotal,
    reviewsToday
  }
}

export const calculateReviewSeries = (
  reviewLogs: ReviewLog[],
  days: number,
  todayKey: DateKey
): DailyReviewStats[] => {
  const keys = getPeriodKeys(days, todayKey)
  const byDay = new Map<DateKey, { good: number; bad: number }>()

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

export const calculateTagStats = (
  cards: Card[],
  reviewStates: ReviewState[],
  reviewLogs: ReviewLog[]
): TagStatsResult => {
  const stateByCard = new Map<number, ReviewState>()
  reviewStates.forEach((state) => stateByCard.set(state.card_id, state))

  const cardPrefixes = new Map<number, string[]>()
  cards.forEach((card) => {
    if (!card.id) {
      return
    }
    const prefixes = buildPrefixes(card.tags)
    cardPrefixes.set(card.id, prefixes)
  })

  const statsMap = new Map<
    string,
    { path: string; name: string; cardIds: Set<number>; boxSum: number; good: number; bad: number }
  >()

  const ensureStat = (path: string) => {
    const existing = statsMap.get(path)
    if (existing) {
      return existing
    }
    const name = path.includes('/') ? path.split('/').slice(-1)[0] : path
    const created = { path, name, cardIds: new Set<number>(), boxSum: 0, good: 0, bad: 0 }
    statsMap.set(path, created)
    return created
  }

  cards.forEach((card) => {
    const cardId = card.id
    if (!cardId) {
      return
    }
    const prefixes = cardPrefixes.get(cardId) ?? []
    const box = stateByCard.get(cardId)?.box ?? 0
    prefixes.forEach((prefix) => {
      const stat = ensureStat(prefix)
      if (!stat.cardIds.has(cardId)) {
        stat.cardIds.add(cardId)
        stat.boxSum += box
      }
    })
  })

  reviewLogs.forEach((log) => {
    const prefixes = cardPrefixes.get(log.card_id) ?? []
    prefixes.forEach((prefix) => {
      const stat = ensureStat(prefix)
      if (log.result === 'good') {
        stat.good += 1
      } else {
        stat.bad += 1
      }
    })
  })

  const statsByPath: Record<string, TagStat> = {}
  statsMap.forEach((stat) => {
    const reviewsTotal = stat.good + stat.bad
    statsByPath[stat.path] = {
      path: stat.path,
      name: stat.name,
      cardCount: stat.cardIds.size,
      avgBox: stat.cardIds.size === 0 ? 0 : Number((stat.boxSum / stat.cardIds.size).toFixed(2)),
      good: stat.good,
      bad: stat.bad,
      reviewsTotal,
      successRate: reviewsTotal === 0 ? null : Number((stat.good / reviewsTotal).toFixed(2))
    }
  })

  const rootTags = Object.keys(statsByPath)
    .filter((path) => !path.includes('/'))
    .sort((a, b) => a.localeCompare(b))

  return { statsByPath, rootTags }
}

export const calculateLeitnerStats = (reviewLogs: ReviewLog[]): LeitnerStats => {
  const transitionsMap = new Map<string, number>()
  const logsByCard = new Map<number, ReviewLog[]>()

  reviewLogs.forEach((log) => {
    const key = `${log.previous_box}->${log.new_box}`
    transitionsMap.set(key, (transitionsMap.get(key) ?? 0) + 1)

    const list = logsByCard.get(log.card_id) ?? []
    list.push(log)
    logsByCard.set(log.card_id, list)
  })

  const transitions = Array.from(transitionsMap.entries()).map(([key, count]) => {
    const [from, to] = key.split('->').map(Number)
    return { from, to, count }
  })

  let promotionSum = 0
  let promotionCount = 0

  logsByCard.forEach((logs) => {
    logs.sort((a, b) => a.timestamp.localeCompare(b.timestamp))
    let lastTimestamp: string | null = null
    logs.forEach((log) => {
      if (lastTimestamp && log.result === 'good' && log.new_box > log.previous_box) {
        const diffMs = new Date(log.timestamp).getTime() - new Date(lastTimestamp).getTime()
        if (diffMs > 0) {
          promotionSum += diffMs / (1000 * 60 * 60 * 24)
          promotionCount += 1
        }
      }
      lastTimestamp = log.timestamp
    })
  })

  const avgDaysToPromote =
    promotionCount === 0 ? null : Number((promotionSum / promotionCount).toFixed(2))

  const relapseCount = reviewLogs.filter(
    (log) => log.new_box === 1 && log.previous_box > 1
  ).length
  const relapseRate =
    reviewLogs.length === 0 ? null : Number((relapseCount / reviewLogs.length).toFixed(2))

  return { transitions, avgDaysToPromote, relapseRate }
}

export const calculateCardInsights = (
  cards: Card[],
  reviewStates: ReviewState[],
  reviewLogs: ReviewLog[],
  todayKey: DateKey
): CardInsights => {
  const reviewedCardIds = new Set<number>()
  const failures = new Map<number, number>()
  reviewLogs.forEach((log) => {
    reviewedCardIds.add(log.card_id)
    if (log.result === 'bad') {
      failures.set(log.card_id, (failures.get(log.card_id) ?? 0) + 1)
    }
  })

  const neverReviewed = cards
    .filter((card) => card.id && !reviewedCardIds.has(card.id))
    .slice(0, 5)
    .map((card) => ({ id: card.id ?? 0, front: card.front_md }))

  const mostFailed = Array.from(failures.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([cardId, count]) => {
      const card = cards.find((item) => item.id === cardId)
      return { id: cardId, front: card?.front_md ?? 'Carte', fails: count }
    })

  const stateByCard = new Map<number, ReviewState>()
  reviewStates.forEach((state) => stateByCard.set(state.card_id, state))

  const stuckLowBox = cards
    .map((card) => {
      if (!card.id) {
        return null
      }
      const state = stateByCard.get(card.id)
      if (!state || state.box > 2 || !state.due_date) {
        return null
      }
      if (state.due_date >= todayKey) {
        return null
      }
      const diffMs = parseDateKey(todayKey).getTime() - parseDateKey(state.due_date).getTime()
      const daysOverdue = Math.floor(diffMs / (1000 * 60 * 60 * 24))
      return { id: card.id, front: card.front_md, daysOverdue }
    })
    .filter((item): item is { id: number; front: string; daysOverdue: number } => Boolean(item))
    .sort((a, b) => b.daysOverdue - a.daysOverdue)
    .slice(0, 5)

  return { neverReviewed, mostFailed, stuckLowBox }
}
