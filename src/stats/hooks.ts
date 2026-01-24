import { useEffect, useMemo, useState } from 'react'
import db from '../db'
import type { Card, ReviewLog, ReviewState } from '../db/types'
import {
  calculateCardInsights,
  calculateGlobalStats,
  calculateLeitnerStats,
  calculateReviewSeries,
  calculateTagStats,
  getTodayKey,
  type CardInsights,
  type DailyReviewStats,
  type GlobalStats,
  type LeitnerStats,
  type TagStatsResult
} from './calculations'

type StatsState = {
  cards: Card[]
  reviewStates: ReviewState[]
  reviewLogs: ReviewLog[]
}

export type UseStatsResult = {
  isLoading: boolean
  error: string | null
  global: GlobalStats
  reviewSeries: DailyReviewStats[]
  tagStats: TagStatsResult
  leitner: LeitnerStats
  insights: CardInsights
}

const emptyStats: UseStatsResult = {
  isLoading: true,
  error: null,
  global: {
    totalCards: 0,
    boxCounts: { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    dueToday: 0,
    reviewsTotal: 0,
    reviewsToday: 0
  },
  reviewSeries: [],
  tagStats: { statsByPath: {}, rootTags: [] },
  leitner: { transitions: [], avgDaysToPromote: null, relapseRate: null },
  insights: { neverReviewed: [], mostFailed: [], stuckLowBox: [] }
}

export const useStats = (periodDays: number): UseStatsResult => {
  const [state, setState] = useState<StatsState>({
    cards: [],
    reviewStates: [],
    reviewLogs: []
  })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        const [cards, reviewStates, reviewLogs] = await Promise.all([
          db.cards.toArray(),
          db.reviewStates.toArray(),
          db.reviewLogs.toArray()
        ])
        setState({ cards, reviewStates, reviewLogs })
      } catch (err) {
        setError((err as Error).message)
      } finally {
        setIsLoading(false)
      }
    }

    void load()
  }, [])

  return useMemo(() => {
    if (isLoading) {
      return { ...emptyStats, isLoading, error }
    }

    const todayKey = getTodayKey()
    const global = calculateGlobalStats(
      state.cards,
      state.reviewStates,
      state.reviewLogs,
      todayKey
    )
    const reviewSeries = calculateReviewSeries(state.reviewLogs, periodDays, todayKey)
    const tagStats = calculateTagStats(state.cards, state.reviewStates, state.reviewLogs)
    const leitner = calculateLeitnerStats(state.reviewLogs)
    const insights = calculateCardInsights(
      state.cards,
      state.reviewStates,
      state.reviewLogs,
      todayKey
    )

    return {
      isLoading,
      error,
      global,
      reviewSeries,
      tagStats,
      leitner,
      insights
    }
  }, [error, isLoading, periodDays, state])
}
