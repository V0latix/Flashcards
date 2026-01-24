export type DailyReviewAgg = {
  date: string
  total: number
  good: number
  bad: number
}

export type BoxDistribution = {
  counts: Record<number, number>
  total: number
}

export type TagAgg = {
  tagPath: string
  cardsCount: number
  dueCount: number
  successRate: number | null
  avgBox: number
  learnedCount: number
}
