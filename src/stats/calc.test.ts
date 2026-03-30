import { describe, expect, it } from "vitest";
import type { Card, ReviewLog, ReviewState } from "../db/types";
import {
  calcBoxDistribution,
  calcDailyReviews,
  calcGlobalSummary,
  calcTagTreeAgg,
} from "./calc";

// --- Builders ---

const buildCard = (overrides: Partial<Card> & { id: number }): Card => ({
  front_md: "Q",
  back_md: "A",
  tags: [],
  created_at: "2024-01-01T00:00:00.000Z",
  updated_at: "2024-01-01T00:00:00.000Z",
  ...overrides,
});

const buildState = (
  overrides: Partial<ReviewState> & { card_id: number },
): ReviewState => ({
  box: 1,
  due_date: null,
  is_learned: false,
  learned_at: null,
  ...overrides,
});

const buildLog = (
  overrides: Partial<ReviewLog> & { card_id: number; timestamp: string },
): ReviewLog => ({
  result: "good",
  previous_box: 1,
  new_box: 2,
  ...overrides,
});

// --- calcBoxDistribution ---

describe("calcBoxDistribution", () => {
  it("returns zero counts when no review states", () => {
    const result = calcBoxDistribution([]);
    expect(result.total).toBe(0);
    expect(result.counts).toEqual({ 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 });
  });

  it("counts cards per box", () => {
    const states = [
      buildState({ card_id: 1, box: 1 }),
      buildState({ card_id: 2, box: 1 }),
      buildState({ card_id: 3, box: 3 }),
      buildState({ card_id: 4, box: 5 }),
    ];
    const result = calcBoxDistribution(states);
    expect(result.total).toBe(4);
    expect(result.counts[1]).toBe(2);
    expect(result.counts[3]).toBe(1);
    expect(result.counts[5]).toBe(1);
    expect(result.counts[0]).toBe(0);
  });

  it("accumulates counts for same box", () => {
    const states = Array.from({ length: 10 }, (_, i) =>
      buildState({ card_id: i + 1, box: 2 }),
    );
    const result = calcBoxDistribution(states);
    expect(result.counts[2]).toBe(10);
    expect(result.total).toBe(10);
  });
});

// --- calcDailyReviews ---

describe("calcDailyReviews", () => {
  const today = "2024-03-15";

  it("returns all zeroes when no logs", () => {
    const result = calcDailyReviews([], 7, today);
    expect(result).toHaveLength(7);
    result.forEach((day) => {
      expect(day.total).toBe(0);
      expect(day.good).toBe(0);
      expect(day.bad).toBe(0);
    });
  });

  it("last entry is today", () => {
    const result = calcDailyReviews([], 7, today);
    expect(result[result.length - 1].date).toBe(today);
  });

  it("aggregates good and bad counts per day", () => {
    const logs: ReviewLog[] = [
      buildLog({
        card_id: 1,
        timestamp: "2024-03-15T10:00:00.000Z",
        result: "good",
      }),
      buildLog({
        card_id: 2,
        timestamp: "2024-03-15T11:00:00.000Z",
        result: "bad",
      }),
      buildLog({
        card_id: 3,
        timestamp: "2024-03-14T09:00:00.000Z",
        result: "good",
      }),
    ];
    const result = calcDailyReviews(logs, 7, today);
    const todayEntry = result.find((d) => d.date === "2024-03-15");
    const yesterdayEntry = result.find((d) => d.date === "2024-03-14");
    expect(todayEntry?.good).toBe(1);
    expect(todayEntry?.bad).toBe(1);
    expect(todayEntry?.total).toBe(2);
    expect(yesterdayEntry?.good).toBe(1);
    expect(yesterdayEntry?.bad).toBe(0);
  });

  it("ignores logs outside the period window", () => {
    const logs: ReviewLog[] = [
      buildLog({
        card_id: 1,
        timestamp: "2024-02-01T10:00:00.000Z",
        result: "good",
      }),
    ];
    const result = calcDailyReviews(logs, 7, today);
    expect(result.every((d) => d.total === 0)).toBe(true);
  });

  it("returns correct length for 30 and 90 day periods", () => {
    expect(calcDailyReviews([], 30, today)).toHaveLength(30);
    expect(calcDailyReviews([], 90, today)).toHaveLength(90);
  });
});

// --- calcGlobalSummary ---

describe("calcGlobalSummary", () => {
  const today = "2024-03-15";

  it("returns zeroes for empty data", () => {
    const result = calcGlobalSummary([], [], [], today, 90);
    expect(result).toEqual({
      totalCards: 0,
      dueToday: 0,
      learnedCount: 0,
      reviewsToday: 0,
      successRate7d: null,
    });
  });

  it("counts total cards", () => {
    const cards = [buildCard({ id: 1 }), buildCard({ id: 2 })];
    const result = calcGlobalSummary(cards, [], [], today, 90);
    expect(result.totalCards).toBe(2);
  });

  it("counts reviews done today", () => {
    const logs: ReviewLog[] = [
      buildLog({ card_id: 1, timestamp: "2024-03-15T08:00:00.000Z" }),
      buildLog({ card_id: 2, timestamp: "2024-03-15T09:00:00.000Z" }),
      buildLog({ card_id: 3, timestamp: "2024-03-14T09:00:00.000Z" }),
    ];
    const result = calcGlobalSummary([], [], logs, today, 90);
    expect(result.reviewsToday).toBe(2);
  });

  it("counts cards due today (box >= 2 with past due_date)", () => {
    const states: ReviewState[] = [
      buildState({ card_id: 1, box: 2, due_date: "2024-03-14" }),
      buildState({ card_id: 2, box: 2, due_date: "2024-03-15" }),
      buildState({ card_id: 3, box: 2, due_date: "2024-03-16" }),
      buildState({ card_id: 4, box: 1, due_date: "2024-03-01" }),
    ];
    const result = calcGlobalSummary([], states, [], today, 90);
    expect(result.dueToday).toBe(2);
  });

  it("counts learned cards (is_learned = true)", () => {
    const states: ReviewState[] = [
      buildState({
        card_id: 1,
        box: 5,
        is_learned: true,
        learned_at: "2024-01-01T00:00:00.000Z",
      }),
      buildState({ card_id: 2, box: 3, is_learned: false }),
    ];
    const result = calcGlobalSummary([], states, [], today, 90);
    expect(result.learnedCount).toBe(1);
  });

  it("calculates successRate7d as null when no recent logs", () => {
    const result = calcGlobalSummary([], [], [], today, 90);
    expect(result.successRate7d).toBeNull();
  });

  it("calculates successRate7d from last 7 days logs", () => {
    const logs: ReviewLog[] = [
      buildLog({
        card_id: 1,
        timestamp: "2024-03-15T10:00:00.000Z",
        result: "good",
      }),
      buildLog({
        card_id: 2,
        timestamp: "2024-03-14T10:00:00.000Z",
        result: "good",
      }),
      buildLog({
        card_id: 3,
        timestamp: "2024-03-13T10:00:00.000Z",
        result: "bad",
      }),
      buildLog({
        card_id: 4,
        timestamp: "2024-03-12T10:00:00.000Z",
        result: "bad",
      }),
    ];
    const result = calcGlobalSummary([], [], logs, today, 90);
    expect(result.successRate7d).toBe(0.5);
  });

  it("excludes logs older than 7 days from successRate7d", () => {
    const logs: ReviewLog[] = [
      buildLog({
        card_id: 1,
        timestamp: "2024-03-15T10:00:00.000Z",
        result: "good",
      }),
      buildLog({
        card_id: 2,
        timestamp: "2024-02-01T10:00:00.000Z",
        result: "bad",
      }),
    ];
    const result = calcGlobalSummary([], [], logs, today, 90);
    expect(result.successRate7d).toBe(1);
  });
});

// --- calcTagTreeAgg ---

describe("calcTagTreeAgg", () => {
  const today = "2024-03-15";

  it("returns empty object when no cards", () => {
    const result = calcTagTreeAgg([], [], [], today, 90);
    expect(result).toEqual({});
  });

  it("creates entries for each tag prefix", () => {
    const cards = [buildCard({ id: 1, tags: ["geo/europe/france"] })];
    const states = [buildState({ card_id: 1, box: 2 })];
    const result = calcTagTreeAgg(cards, states, [], today, 90);
    expect(Object.keys(result)).toContain("geo");
    expect(Object.keys(result)).toContain("geo/europe");
    expect(Object.keys(result)).toContain("geo/europe/france");
  });

  it("counts cards per tag including parents", () => {
    const cards = [
      buildCard({ id: 1, tags: ["geo/europe/france"] }),
      buildCard({ id: 2, tags: ["geo/europe/spain"] }),
      buildCard({ id: 3, tags: ["history"] }),
    ];
    const states = [
      buildState({ card_id: 1, box: 1 }),
      buildState({ card_id: 2, box: 2 }),
      buildState({ card_id: 3, box: 1 }),
    ];
    const result = calcTagTreeAgg(cards, states, [], today, 90);
    expect(result["geo"].cardsCount).toBe(2);
    expect(result["geo/europe"].cardsCount).toBe(2);
    expect(result["geo/europe/france"].cardsCount).toBe(1);
    expect(result["history"].cardsCount).toBe(1);
  });

  it("calculates successRate from review logs", () => {
    const cards = [buildCard({ id: 1, tags: ["math"] })];
    const states = [buildState({ card_id: 1, box: 2 })];
    const logs: ReviewLog[] = [
      buildLog({
        card_id: 1,
        timestamp: "2024-03-15T10:00:00.000Z",
        result: "good",
      }),
      buildLog({
        card_id: 1,
        timestamp: "2024-03-14T10:00:00.000Z",
        result: "bad",
      }),
    ];
    const result = calcTagTreeAgg(cards, states, logs, today, 90);
    expect(result["math"].successRate).toBe(0.5);
  });

  it("successRate is null when no logs for tag", () => {
    const cards = [buildCard({ id: 1, tags: ["math"] })];
    const states = [buildState({ card_id: 1, box: 1 })];
    const result = calcTagTreeAgg(cards, states, [], today, 90);
    expect(result["math"].successRate).toBeNull();
  });

  it("calculates avgBox", () => {
    const cards = [
      buildCard({ id: 1, tags: ["lang"] }),
      buildCard({ id: 2, tags: ["lang"] }),
    ];
    const states = [
      buildState({ card_id: 1, box: 2 }),
      buildState({ card_id: 2, box: 4 }),
    ];
    const result = calcTagTreeAgg(cards, states, [], today, 90);
    expect(result["lang"].avgBox).toBe(3);
  });

  it("counts learned cards per tag", () => {
    const cards = [
      buildCard({ id: 1, tags: ["vocab"] }),
      buildCard({ id: 2, tags: ["vocab"] }),
    ];
    const states = [
      buildState({
        card_id: 1,
        box: 5,
        is_learned: true,
        learned_at: "2024-01-01T00:00:00.000Z",
      }),
      buildState({ card_id: 2, box: 2, is_learned: false }),
    ];
    const result = calcTagTreeAgg(cards, states, [], today, 90);
    expect(result["vocab"].learnedCount).toBe(1);
  });

  it("ignores cards without id", () => {
    const cardWithoutId: Card = {
      front_md: "Q",
      back_md: "A",
      tags: ["test"],
      created_at: "2024-01-01T00:00:00.000Z",
      updated_at: "2024-01-01T00:00:00.000Z",
    };
    const result = calcTagTreeAgg([cardWithoutId], [], [], today, 90);
    expect(result).toEqual({});
  });
});
