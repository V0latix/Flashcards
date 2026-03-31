/** One day in the 365-day activity heatmap. */
export type ActivityDay = {
  date: string;
  count: number;
  /** 0 = no reviews, 1–4 = increasing intensity */
  level: 0 | 1 | 2 | 3 | 4;
};

/** Success rate for reviews that started from a specific Leitner box. */
export type BoxRetentionStat = {
  box: number;
  totalReviews: number;
  goodCount: number;
  /** null when no reviews have been made from this box */
  successRate: number | null;
};

export type DailyReviewAgg = {
  date: string;
  total: number;
  good: number;
  bad: number;
};

export type BoxDistribution = {
  counts: Record<number, number>;
  total: number;
};

export type TagAgg = {
  tagPath: string;
  cardsCount: number;
  dueCount: number;
  successRate: number | null;
  avgBox: number;
  learnedCount: number;
};
