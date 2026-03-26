/**
 * Resilience tests for the sync engine.
 * Covers vulnerabilities identified in the BMAD brownfield report:
 *  - Network failures (fetchRemoteSnapshot / upsertRemoteCards throws)
 *  - isSyncing flag correctly reset after errors
 *  - Concurrent sync calls (pendingSync queuing)
 *  - Remote card absent locally → added to local DB
 *  - Local newer than remote → local wins (not overwritten)
 *  - Pending deletes flushed to deleteRemoteCards
 *  - ReviewLog idempotence (already-synced logs not re-inserted)
 *  - Remote review logs added to local when missing
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import db from "../db";
import { resetDb } from "../test/utils";
import { runInitialSync, setActiveUser, syncOnce } from "./engine";
import {
  deleteRemoteCards,
  fetchRemoteSnapshot,
  insertRemoteReviewLogs,
  upsertRemoteCards,
  upsertRemoteProgress,
} from "./remoteStore";

vi.mock("./remoteStore", () => ({
  fetchRemoteSnapshot: vi.fn(),
  upsertRemoteCards: vi.fn(),
  upsertRemoteProgress: vi.fn(),
  upsertRemoteSettings: vi.fn(),
  insertRemoteReviewLogs: vi.fn(),
  deleteRemoteCards: vi.fn(),
}));

const emptyRemote = {
  cards: [],
  progress: [],
  settings: null,
  reviewLogs: [],
};

const makeRemoteCard = (overrides: Record<string, unknown> = {}) => ({
  id: "cloud-remote-1",
  user_id: "user-1",
  source_type: "manual" as const,
  source_ref: null,
  source_public_id: null,
  suspended: false,
  front_md: "Remote Q",
  back_md: "Remote A",
  tags: [],
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
  ...overrides,
});

describe("sync engine — network resilience", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    localStorage.clear();
    await resetDb();
  });

  it("runInitialSync does not throw when fetchRemoteSnapshot rejects", async () => {
    vi.mocked(fetchRemoteSnapshot).mockRejectedValue(
      new Error("Network error"),
    );

    await expect(runInitialSync("user-1")).resolves.not.toThrow();
  });

  it("syncOnce does not throw when fetchRemoteSnapshot rejects", async () => {
    vi.mocked(fetchRemoteSnapshot).mockRejectedValue(
      new Error("Network timeout"),
    );

    await expect(syncOnce("user-1", true)).resolves.not.toThrow();
  });

  it("syncOnce does not throw when upsertRemoteCards rejects", async () => {
    const now = "2026-01-01T00:00:00.000Z";
    await db.cards.add({
      front_md: "Q",
      back_md: "A",
      tags: [],
      created_at: now,
      updated_at: now,
      source_type: null,
      source_id: null,
      source_ref: null,
      cloud_id: null,
    });

    vi.mocked(fetchRemoteSnapshot).mockResolvedValue(emptyRemote);
    vi.mocked(upsertRemoteCards).mockRejectedValue(new Error("Supabase 503"));

    await expect(syncOnce("user-1", true)).resolves.not.toThrow();
  });

  it("local DB is not corrupted after a failed sync", async () => {
    const now = "2026-01-01T00:00:00.000Z";
    const cardId = await db.cards.add({
      front_md: "Precious local card",
      back_md: "A",
      tags: [],
      created_at: now,
      updated_at: now,
      source_type: null,
      source_id: null,
      source_ref: null,
      cloud_id: null,
    });

    vi.mocked(fetchRemoteSnapshot).mockRejectedValue(
      new Error("Network error"),
    );

    await syncOnce("user-1", true);

    // Card must still be present locally
    const card = await db.cards.get(cardId);
    expect(card).toBeDefined();
    expect(card?.front_md).toBe("Precious local card");
  });
});

describe("sync engine — concurrent calls", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    localStorage.clear();
    await resetDb();
    setActiveUser(null);
  });

  it("second syncOnce call while first is running does not run in parallel", async () => {
    let resolveFirst!: () => void;
    const firstCallPromise = new Promise<void>((resolve) => {
      resolveFirst = resolve;
    });

    vi.mocked(fetchRemoteSnapshot).mockImplementationOnce(async () => {
      await firstCallPromise;
      return emptyRemote;
    });
    vi.mocked(fetchRemoteSnapshot).mockResolvedValue(emptyRemote);

    const first = syncOnce("user-1", true);
    // Second call while first is still awaiting fetchRemoteSnapshot
    const second = syncOnce("user-1", true);

    resolveFirst();
    await Promise.all([first, second]);

    // fetchRemoteSnapshot should only have been called once (second was queued/skipped)
    expect(fetchRemoteSnapshot).toHaveBeenCalledTimes(1);
  });
});

describe("sync engine — remote → local propagation", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    localStorage.clear();
    await resetDb();
  });

  it("adds remote-only card to local DB when local is empty", async () => {
    vi.mocked(fetchRemoteSnapshot).mockResolvedValue({
      cards: [makeRemoteCard()],
      progress: [],
      settings: null,
      reviewLogs: [],
    });

    await runInitialSync("user-1");

    const count = await db.cards.count();
    expect(count).toBe(1);
    const card = await db.cards
      .where("cloud_id")
      .equals("cloud-remote-1")
      .first();
    expect(card?.front_md).toBe("Remote Q");
    expect(card?.suspended).toBe(false);
  });

  it("adds remote card not present locally during incremental sync", async () => {
    const now = "2026-01-01T00:00:00.000Z";
    // Seed a different local card
    await db.cards.add({
      front_md: "Local card",
      back_md: "A",
      tags: [],
      created_at: now,
      updated_at: now,
      source_type: null,
      source_id: null,
      source_ref: null,
      cloud_id: "cloud-local-1",
    });
    localStorage.setItem("flashcards_last_sync_at", now);

    vi.mocked(fetchRemoteSnapshot).mockResolvedValue({
      cards: [makeRemoteCard({ id: "cloud-new-remote" })],
      progress: [],
      settings: null,
      reviewLogs: [],
    });

    await syncOnce("user-1", true);

    const count = await db.cards.count();
    // Both local and new remote card should exist
    expect(count).toBeGreaterThanOrEqual(2);
    const remote = await db.cards
      .where("cloud_id")
      .equals("cloud-new-remote")
      .first();
    expect(remote?.front_md).toBe("Remote Q");
  });

  it("does not overwrite local card when local updated_at is newer", async () => {
    const older = "2026-01-01T00:00:00.000Z";
    const newer = "2026-06-01T00:00:00.000Z";

    const cardId = await db.cards.add({
      front_md: "Locally updated Q",
      back_md: "A",
      tags: [],
      created_at: older,
      updated_at: newer, // local is newer
      source_type: "manual",
      source_id: null,
      source_ref: null,
      cloud_id: "cloud-1",
    });

    vi.mocked(fetchRemoteSnapshot).mockResolvedValue({
      cards: [
        makeRemoteCard({
          id: "cloud-1",
          front_md: "Stale Remote Q",
          updated_at: older,
        }),
      ],
      progress: [],
      settings: null,
      reviewLogs: [],
    });

    await syncOnce("user-1", true);

    const card = await db.cards.get(cardId);
    expect(card?.front_md).toBe("Locally updated Q"); // local wins
  });

  it("imports remote reviewLogs missing from local DB", async () => {
    const now = "2026-01-01T00:00:00.000Z";
    const cardId = await db.cards.add({
      front_md: "Q",
      back_md: "A",
      tags: [],
      created_at: now,
      updated_at: now,
      source_type: "manual",
      source_id: null,
      source_ref: null,
      cloud_id: "cloud-1",
    });
    await db.reviewStates.add({
      card_id: cardId,
      box: 2,
      due_date: null,
      is_learned: false,
      learned_at: null,
    });

    vi.mocked(fetchRemoteSnapshot).mockResolvedValue({
      cards: [makeRemoteCard({ id: "cloud-1", updated_at: now })],
      progress: [],
      settings: null,
      reviewLogs: [
        {
          id: "log-uuid-1",
          user_id: "user-1",
          card_id: "cloud-1",
          result: true,
          reviewed_at: "2026-01-02T10:00:00.000Z",
          device_id: "device-abc",
          client_event_id: "event-uuid-1",
          created_at: "2026-01-02T10:00:00.000Z",
        },
      ],
    });

    await syncOnce("user-1", true);

    const logs = await db.reviewLogs.where("card_id").equals(cardId).toArray();
    expect(logs).toHaveLength(1);
    expect(logs[0].result).toBe("good");
    expect(logs[0].client_event_id).toBe("event-uuid-1");
  });

  it("does not duplicate reviewLogs already present locally", async () => {
    const now = "2026-01-01T00:00:00.000Z";
    const cardId = await db.cards.add({
      front_md: "Q",
      back_md: "A",
      tags: [],
      created_at: now,
      updated_at: now,
      source_type: "manual",
      source_id: null,
      source_ref: null,
      cloud_id: "cloud-1",
    });
    await db.reviewStates.add({
      card_id: cardId,
      box: 2,
      due_date: null,
      is_learned: false,
      learned_at: null,
    });
    // Pre-existing local log with the same client_event_id
    await db.reviewLogs.add({
      card_id: cardId,
      timestamp: "2026-01-02T10:00:00.000Z",
      result: "good",
      previous_box: 1,
      new_box: 2,
      client_event_id: "event-uuid-already-here",
      device_id: null,
    });

    vi.mocked(fetchRemoteSnapshot).mockResolvedValue({
      cards: [makeRemoteCard({ id: "cloud-1", updated_at: now })],
      progress: [],
      settings: null,
      reviewLogs: [
        {
          id: "log-uuid-2",
          user_id: "user-1",
          card_id: "cloud-1",
          result: true,
          reviewed_at: "2026-01-02T10:00:00.000Z",
          device_id: "device-abc",
          client_event_id: "event-uuid-already-here", // same id
          created_at: "2026-01-02T10:00:00.000Z",
        },
      ],
    });

    await syncOnce("user-1", true);

    const logs = await db.reviewLogs.where("card_id").equals(cardId).toArray();
    expect(logs).toHaveLength(1); // no duplicate
  });
});

describe("sync engine — pending deletes", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    localStorage.clear();
    await resetDb();
  });

  it("flushes pending deletes to deleteRemoteCards on next syncOnce", async () => {
    // Manually set a pending delete by importing enqueueRemoteDelete
    const { enqueueRemoteDelete, setActiveUser: _setActiveUser } =
      await import("./engine");
    _setActiveUser("user-1");

    vi.mocked(fetchRemoteSnapshot).mockResolvedValue(emptyRemote);
    vi.mocked(deleteRemoteCards).mockResolvedValue(undefined as never);

    enqueueRemoteDelete("cloud-to-delete");
    // Cancel the debounced requestSync and call syncOnce directly
    await syncOnce("user-1", false);

    expect(deleteRemoteCards).toHaveBeenCalledWith(
      "user-1",
      expect.arrayContaining(["cloud-to-delete"]),
    );
  });

  it("deduplicates pending deletes before sending to remote", async () => {
    const { enqueueRemoteDelete, setActiveUser: _setActiveUser } =
      await import("./engine");
    _setActiveUser("user-1");

    vi.mocked(fetchRemoteSnapshot).mockResolvedValue(emptyRemote);
    vi.mocked(deleteRemoteCards).mockResolvedValue(undefined as never);

    enqueueRemoteDelete("cloud-dup");
    enqueueRemoteDelete("cloud-dup");
    enqueueRemoteDelete("cloud-dup");

    await syncOnce("user-1", false);

    const deletedIds = vi.mocked(deleteRemoteCards).mock.calls[0]?.[1] ?? [];
    const uniqueIds = [...new Set(deletedIds)];
    expect(deletedIds).toHaveLength(uniqueIds.length);
  });
});

describe("sync engine — large dataset regression", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    localStorage.clear();
    await resetDb();
  });

  it("handles 500 local cards without error", async () => {
    const now = "2026-01-01T00:00:00.000Z";
    const cards = Array.from({ length: 500 }, (_, i) => ({
      front_md: `Q ${i}`,
      back_md: `A ${i}`,
      tags: [],
      created_at: now,
      updated_at: now,
      source_type: null as null,
      source_id: null as null,
      source_ref: null as null,
      cloud_id: null as null,
    }));
    await db.cards.bulkAdd(cards);

    vi.mocked(fetchRemoteSnapshot).mockResolvedValue(emptyRemote);
    vi.mocked(upsertRemoteCards).mockResolvedValue(undefined as never);
    vi.mocked(upsertRemoteProgress).mockResolvedValue(undefined as never);

    await expect(runInitialSync("user-1")).resolves.not.toThrow();

    // All cards should have been assigned a cloud_id
    const updated = await db.cards.toArray();
    const withoutCloudId = updated.filter((c) => !c.cloud_id);
    expect(withoutCloudId).toHaveLength(0);
  });

  it("handles 200 remote-only cards without error", async () => {
    const remoteCards = Array.from({ length: 200 }, (_, i) =>
      makeRemoteCard({
        id: `cloud-${i}`,
        front_md: `Remote Q ${i}`,
        updated_at: "2026-01-01T00:00:00.000Z",
      }),
    );

    vi.mocked(fetchRemoteSnapshot).mockResolvedValue({
      cards: remoteCards,
      progress: [],
      settings: null,
      reviewLogs: [],
    });

    await expect(runInitialSync("user-1")).resolves.not.toThrow();

    const count = await db.cards.count();
    expect(count).toBe(200);
  });
});
