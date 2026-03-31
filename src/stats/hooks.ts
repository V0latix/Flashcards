import { useEffect, useMemo, useState } from "react";
import db from "../db";
import type { Card, ReviewLog, ReviewState } from "../db/types";
import { getLeitnerSettings } from "../leitner/settings";
import {
  calcActivityHeatmap,
  calcBoxDistribution,
  calcDailyReviews,
  calcGlobalSummary,
  calcRetentionByBox,
  calcTagTreeAgg,
} from "./calc";
import type {
  ActivityDay,
  BoxDistribution,
  BoxRetentionStat,
  DailyReviewAgg,
  TagAgg,
} from "./types";

type StatsState = {
  cards: Card[];
  reviewStates: ReviewState[];
  reviewLogs: ReviewLog[];
};

export type UseStatsResult = {
  isLoading: boolean;
  error: string | null;
  cards: Card[];
  reviewStates: ReviewState[];
  reviewLogs: ReviewLog[];
  global: {
    totalCards: number;
    dueToday: number;
    learnedCount: number;
    reviewsToday: number;
    successRate7d: number | null;
  };
  dailyReviews: DailyReviewAgg[];
  boxDistribution: BoxDistribution;
  tagAgg: Record<string, TagAgg>;
  activityHeatmap: ActivityDay[];
  retentionByBox: BoxRetentionStat[];
};

const emptyStats: UseStatsResult = {
  isLoading: true,
  error: null,
  cards: [],
  reviewStates: [],
  reviewLogs: [],
  global: {
    totalCards: 0,
    dueToday: 0,
    learnedCount: 0,
    reviewsToday: 0,
    successRate7d: null,
  },
  dailyReviews: [],
  boxDistribution: { counts: { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }, total: 0 },
  tagAgg: {},
  activityHeatmap: [],
  retentionByBox: [],
};

export const useStats = (periodDays: 7 | 30 | 90): UseStatsResult => {
  const [state, setState] = useState<StatsState>({
    cards: [],
    reviewStates: [],
    reviewLogs: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [cards, reviewStates, reviewLogs] = await Promise.all([
          db.cards.toArray(),
          db.reviewStates.toArray(),
          db.reviewLogs.toArray(),
        ]);
        setState({ cards, reviewStates, reviewLogs });
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setIsLoading(false);
      }
    };

    void load();
  }, []);

  return useMemo(() => {
    if (isLoading) {
      return { ...emptyStats, isLoading, error };
    }

    const todayKey = new Date().toISOString().slice(0, 10);
    const { learnedReviewIntervalDays } = getLeitnerSettings();
    const global = calcGlobalSummary(
      state.cards,
      state.reviewStates,
      state.reviewLogs,
      todayKey,
      learnedReviewIntervalDays,
    );
    const dailyReviews = calcDailyReviews(
      state.reviewLogs,
      periodDays,
      todayKey,
    );
    const boxDistribution = calcBoxDistribution(state.reviewStates);
    const tagAgg = calcTagTreeAgg(
      state.cards,
      state.reviewStates,
      state.reviewLogs,
      todayKey,
      learnedReviewIntervalDays,
    );
    const activityHeatmap = calcActivityHeatmap(state.reviewLogs, todayKey);
    const retentionByBox = calcRetentionByBox(state.reviewLogs);

    return {
      isLoading,
      error,
      cards: state.cards,
      reviewStates: state.reviewStates,
      reviewLogs: state.reviewLogs,
      global,
      dailyReviews,
      boxDistribution,
      tagAgg,
      activityHeatmap,
      retentionByBox,
    };
  }, [error, isLoading, periodDays, state]);
};
