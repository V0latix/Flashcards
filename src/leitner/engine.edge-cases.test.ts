/**
 * Edge-case tests for the Leitner engine.
 * Covers vulnerabilities identified in the BMAD brownfield report:
 *  - applyReviewResult on non-existent card (no crash)
 *  - autoFillBox1 with box1Target=0 (no unwanted promotions)
 *  - Consecutive bad answers stay at box1 with refreshed due_date
 *  - ReviewLog tracks was_learned_before on learned→bad transition
 *  - buildDailySession produces no duplicate card ids
 *  - box1 good answer goes to box2 (not box0 special case)
 *  - Learned card maintenance: good keeps is_learned, due_date stays null
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import db from "../db";
import { applyReviewResult, autoFillBox1, buildDailySession } from "./engine";

const addCardWithState = async (input: {
  front: string;
  back: string;
  createdAt: string;
  box: number;
  dueDate: string | null;
  suspended?: boolean;
  isLearned?: boolean;
  learnedAt?: string | null;
}) => {
  const cardId = await db.cards.add({
    front_md: input.front,
    back_md: input.back,
    suspended: input.suspended ?? false,
    tags: [],
    created_at: input.createdAt,
    updated_at: input.createdAt,
  });
  await db.reviewStates.add({
    card_id: cardId,
    box: input.box,
    due_date: input.dueDate,
    is_learned: input.isLearned ?? false,
    learned_at: input.learnedAt ?? null,
  });
  return cardId;
};

beforeEach(async () => {
  await db.delete();
  await db.open();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("applyReviewResult — edge cases", () => {
  it("does not throw when card_id does not exist", async () => {
    await expect(
      applyReviewResult(99999, "good", "2024-01-10"),
    ).resolves.not.toThrow();
  });

  it("consecutive bad answers keep card in box1 with refreshed due_date", async () => {
    const cardId = await addCardWithState({
      front: "Hard card",
      back: "A",
      createdAt: "2024-01-01",
      box: 3,
      dueDate: "2024-01-10",
    });

    await applyReviewResult(cardId, "bad", "2024-01-10");
    let state = await db.reviewStates.get(cardId);
    expect(state?.box).toBe(1);
    expect(state?.due_date).toBe("2024-01-11");

    // Second bad answer — should stay at box 1, update due_date
    await applyReviewResult(cardId, "bad", "2024-01-11");
    state = await db.reviewStates.get(cardId);
    expect(state?.box).toBe(1);
    expect(state?.due_date).toBe("2024-01-12");
  });

  it("box1 good answer advances to box2 (not a new card path)", async () => {
    const cardId = await addCardWithState({
      front: "Box1 card",
      back: "A",
      createdAt: "2024-01-01",
      box: 1,
      dueDate: "2024-01-10",
    });

    await applyReviewResult(cardId, "good", "2024-01-10");

    const state = await db.reviewStates.get(cardId);
    expect(state?.box).toBe(2);
    // box2 interval = 3 days
    expect(state?.due_date).toBe("2024-01-13");
  });

  it("logs was_learned_before=true when a learned card gets a bad answer", async () => {
    const cardId = await addCardWithState({
      front: "Learned card",
      back: "A",
      createdAt: "2024-01-01",
      box: 5,
      dueDate: null,
      isLearned: true,
      learnedAt: "2024-01-01T10:00:00.000Z",
    });

    await applyReviewResult(cardId, "bad", "2024-01-20");

    const logs = await db.reviewLogs.where("card_id").equals(cardId).toArray();
    expect(logs).toHaveLength(1);
    expect(logs[0].was_learned_before).toBe(true);
    expect(logs[0].previous_box).toBe(5);
    expect(logs[0].new_box).toBe(1);
  });

  it("logs was_learned_before=false when non-learned box5 card gets bad answer", async () => {
    const cardId = await addCardWithState({
      front: "Box5 not yet learned",
      back: "A",
      createdAt: "2024-01-01",
      box: 5,
      dueDate: "2024-01-10",
      isLearned: false,
    });

    await applyReviewResult(cardId, "bad", "2024-01-10");

    const logs = await db.reviewLogs.where("card_id").equals(cardId).toArray();
    expect(logs[0].was_learned_before).toBe(false);
  });

  it("learned card good maintenance: due_date stays null, is_learned stays true", async () => {
    const cardId = await addCardWithState({
      front: "Mastered",
      back: "A",
      createdAt: "2023-01-01",
      box: 5,
      dueDate: null,
      isLearned: true,
      learnedAt: "2023-06-01T00:00:00.000Z",
    });

    await applyReviewResult(cardId, "good", "2024-01-10");

    const state = await db.reviewStates.get(cardId);
    expect(state?.is_learned).toBe(true);
    expect(state?.due_date).toBeNull();
    expect(state?.box).toBe(5);
  });

  it("writes a reviewLog for every applyReviewResult call", async () => {
    const cardId = await addCardWithState({
      front: "Multi-review",
      back: "A",
      createdAt: "2024-01-01",
      box: 2,
      dueDate: "2024-01-10",
    });

    await applyReviewResult(cardId, "good", "2024-01-10");
    await applyReviewResult(cardId, "bad", "2024-01-13");
    await applyReviewResult(cardId, "good", "2024-01-14");

    const logs = await db.reviewLogs.where("card_id").equals(cardId).toArray();
    expect(logs).toHaveLength(3);
  });
});

describe("autoFillBox1 — edge cases", () => {
  it("does not promote any card when box1Target=0", async () => {
    const { saveLeitnerSettings, getLeitnerSettings } =
      await import("./settings");
    const original = getLeitnerSettings();
    saveLeitnerSettings({ ...original, box1Target: 0 });

    const today = "2024-01-10";
    await addCardWithState({
      front: "New card",
      back: "A",
      createdAt: "2024-01-01",
      box: 0,
      dueDate: null,
    });

    await autoFillBox1(today);

    const states = await db.reviewStates.where({ box: 0 }).toArray();
    // Card should remain in box0 (or if due_date was set, it's still box0)
    // The target=0 means no new card should get a due_date set
    const promoted = states.filter((s) => s.due_date === today);
    expect(promoted).toHaveLength(0);

    // Restore
    saveLeitnerSettings(original);
  });

  it("does not exceed box1Target when multiple calls are made the same day", async () => {
    const today = "2024-02-01";
    const { saveLeitnerSettings, getLeitnerSettings } =
      await import("./settings");
    const original = getLeitnerSettings();
    saveLeitnerSettings({ ...original, box1Target: 3 });

    for (let i = 0; i < 10; i++) {
      await addCardWithState({
        front: `New ${i}`,
        back: `A ${i}`,
        createdAt: `2024-01-0${i + 1}`,
        box: 0,
        dueDate: null,
      });
    }

    await autoFillBox1(today);
    await autoFillBox1(today);

    const promoted = (await db.reviewStates.where({ box: 0 }).toArray()).filter(
      (s) => s.due_date === today,
    );
    // Should not exceed target=3 even after two calls
    expect(promoted.length).toBeLessThanOrEqual(3);

    saveLeitnerSettings(original);
  });
});

describe("buildDailySession — edge cases", () => {
  it("produces no duplicate card ids in the session", async () => {
    const today = "2024-03-01";

    // Add cards in multiple boxes all due today
    for (let i = 0; i < 5; i++) {
      await addCardWithState({
        front: `Box1 ${i}`,
        back: "A",
        createdAt: `2024-02-0${i + 1}`,
        box: 1,
        dueDate: today,
      });
    }
    for (let i = 0; i < 3; i++) {
      await addCardWithState({
        front: `Box2 ${i}`,
        back: "A",
        createdAt: `2024-02-1${i}`,
        box: 2,
        dueDate: today,
      });
    }
    await addCardWithState({
      front: "Box3 due",
      back: "A",
      createdAt: "2024-01-01",
      box: 3,
      dueDate: today,
    });

    const session = await buildDailySession(today);
    const allCards = [...session.box1, ...session.due];
    const ids = allCards.map((entry) => entry.card.id);
    const uniqueIds = new Set(ids);

    expect(ids.length).toBe(uniqueIds.size);
  });

  it("excludes cards with future due_date from the session", async () => {
    const today = "2024-03-01";
    const future = "2024-03-10";

    await addCardWithState({
      front: "Due today",
      back: "A",
      createdAt: "2024-02-01",
      box: 2,
      dueDate: today,
    });
    await addCardWithState({
      front: "Future card",
      back: "A",
      createdAt: "2024-02-02",
      box: 2,
      dueDate: future,
    });

    const session = await buildDailySession(today);
    const fronts = [...session.box1, ...session.due].map(
      (e) => e.card.front_md,
    );

    expect(fronts).toContain("Due today");
    expect(fronts).not.toContain("Future card");
  });

  it("includes overdue cards (due_date in the past)", async () => {
    const today = "2024-03-10";
    const overdue = "2024-03-01";

    const overdueId = await addCardWithState({
      front: "Overdue card",
      back: "A",
      createdAt: "2024-01-01",
      box: 3,
      dueDate: overdue,
    });

    const session = await buildDailySession(today);
    const ids = [...session.box1, ...session.due].map((e) => e.card.id);

    expect(ids).toContain(overdueId);
  });

  it("learned cards with null due_date are not included in active session", async () => {
    const today = "2024-03-01";

    await addCardWithState({
      front: "Mastered card",
      back: "A",
      createdAt: "2023-01-01",
      box: 5,
      dueDate: null,
      isLearned: true,
      learnedAt: "2024-02-01T00:00:00.000Z", // 90-day maintenance due 2024-05-01, not yet
    });
    await addCardWithState({
      front: "Normal due card",
      back: "A",
      createdAt: "2024-02-01",
      box: 2,
      dueDate: today,
    });

    const session = await buildDailySession(today);
    const fronts = [...session.box1, ...session.due].map(
      (e) => e.card.front_md,
    );

    // Mastered card with null due_date should not be in active session
    expect(fronts).not.toContain("Mastered card");
    expect(fronts).toContain("Normal due card");
  });
});
