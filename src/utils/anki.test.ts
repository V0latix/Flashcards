/**
 * Tests for src/utils/anki.ts
 *
 * sql.js and jszip are mocked because WASM doesn't run in jsdom.
 * We test our parsing / conversion logic only.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { AnkiCard } from "./anki";

// -------------------------------------------------------------------------
// Shared mock state (mutated per test)
// -------------------------------------------------------------------------

let mockNoteRows: unknown[][] = [];

// sql.js mock — Database must be a real constructor function for `new SQL.Database()`
vi.mock("sql.js", () => {
  const mockDb = {
    exec: (sql: string) => {
      if (sql.includes("SELECT flds, tags FROM notes")) {
        return mockNoteRows.length > 0 ? [{ values: mockNoteRows }] : [];
      }
      return [];
    },
    run: () => undefined,
    prepare: () => ({ run: () => undefined, free: () => undefined }),
    export: () => new Uint8Array([1, 2, 3]),
    close: () => undefined,
  };

  function Database() {
    return mockDb;
  }
  // Also allow `new Database(bytes)` — the constructor ignores the argument
  Database.prototype = Object.create(null);

  const sqlInstance = { Database };

  return {
    default: () => Promise.resolve(sqlInstance),
  };
});

// JSZip mock — use vi.hoisted so refs are available inside vi.mock factory
const { mockLoadAsync, mockZipFileAdd, mockGenerateAsync } = vi.hoisted(() => ({
  mockLoadAsync: vi.fn(),
  mockZipFileAdd: vi.fn(),
  mockGenerateAsync: vi.fn(() =>
    Promise.resolve(new Blob(["zip"], { type: "application/zip" })),
  ),
}));

vi.mock("jszip", () => {
  function MockJSZip(this: Record<string, unknown>) {
    this.file = mockZipFileAdd;
    this.generateAsync = mockGenerateAsync;
  }
  (MockJSZip as unknown as { loadAsync: unknown }).loadAsync = mockLoadAsync;
  return { default: MockJSZip };
});

// -------------------------------------------------------------------------
// Helpers
// -------------------------------------------------------------------------

function makeAnki21Zip() {
  return {
    file: (name: string) => {
      if (name === "collection.anki21") {
        return { async: () => Promise.resolve(new ArrayBuffer(4)) };
      }
      return null;
    },
  };
}

function makeAnki2Zip() {
  return {
    file: (name: string) => {
      if (name === "collection.anki2") {
        return { async: () => Promise.resolve(new ArrayBuffer(4)) };
      }
      return null;
    },
  };
}

// -------------------------------------------------------------------------
// importApkg
// -------------------------------------------------------------------------

describe("importApkg", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNoteRows = [];
    mockLoadAsync.mockResolvedValue(makeAnki21Zip());
  });

  it("returns empty array when notes table has no rows", async () => {
    mockNoteRows = [];
    const { importApkg } = await import("./anki");
    const result = await importApkg(new ArrayBuffer(4));
    expect(result).toEqual([]);
  });

  it("parses a basic note with front and back fields", async () => {
    mockNoteRows = [["What is 2+2?\x1f4", " math "]];
    const { importApkg } = await import("./anki");
    const result = await importApkg(new ArrayBuffer(4));
    expect(result).toHaveLength(1);
    expect(result[0].front).toBe("What is 2+2?");
    expect(result[0].back).toBe("4");
    expect(result[0].tags).toEqual(["math"]);
  });

  it("strips HTML tags from note fields", async () => {
    mockNoteRows = [["<b>Front</b>\x1f<i>Back</i>", " "]];
    const { importApkg } = await import("./anki");
    const result = await importApkg(new ArrayBuffer(4));
    expect(result[0].front).toBe("Front");
    expect(result[0].back).toBe("Back");
  });

  it("skips notes with fewer than 2 fields", async () => {
    mockNoteRows = [["Only one field", " "]];
    const { importApkg } = await import("./anki");
    const result = await importApkg(new ArrayBuffer(4));
    expect(result).toHaveLength(0);
  });

  it("skips notes where front or back is empty after stripping", async () => {
    mockNoteRows = [
      ["\x1fback only", " "],
      ["front only\x1f", " "],
    ];
    const { importApkg } = await import("./anki");
    const result = await importApkg(new ArrayBuffer(4));
    expect(result).toHaveLength(0);
  });

  it("parses multiple tags separated by spaces", async () => {
    mockNoteRows = [["Q\x1fA", " tag1 tag2 tag3 "]];
    const { importApkg } = await import("./anki");
    const result = await importApkg(new ArrayBuffer(4));
    expect(result[0].tags).toEqual(["tag1", "tag2", "tag3"]);
  });

  it("returns empty tags when tag string is blank", async () => {
    mockNoteRows = [["Q\x1fA", " "]];
    const { importApkg } = await import("./anki");
    const result = await importApkg(new ArrayBuffer(4));
    expect(result[0].tags).toEqual([]);
  });

  it("parses multiple notes", async () => {
    mockNoteRows = [
      ["Q1\x1fA1", " "],
      ["Q2\x1fA2", " geo "],
    ];
    const { importApkg } = await import("./anki");
    const result = await importApkg(new ArrayBuffer(4));
    expect(result).toHaveLength(2);
    expect(result[1].front).toBe("Q2");
    expect(result[1].tags).toEqual(["geo"]);
  });

  it("falls back to collection.anki2 if anki21 is absent", async () => {
    mockLoadAsync.mockResolvedValue(makeAnki2Zip());
    mockNoteRows = [["Q\x1fA", " "]];
    const { importApkg } = await import("./anki");
    const result = await importApkg(new ArrayBuffer(4));
    expect(result).toHaveLength(1);
  });

  it("throws if neither collection file is found", async () => {
    mockLoadAsync.mockResolvedValue({ file: () => null });
    const { importApkg } = await import("./anki");
    await expect(importApkg(new ArrayBuffer(4))).rejects.toThrow(
      "Invalid .apkg",
    );
  });
});

// -------------------------------------------------------------------------
// exportApkg
// -------------------------------------------------------------------------

describe("exportApkg", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGenerateAsync.mockResolvedValue(
      new Blob(["zip"], { type: "application/zip" }),
    );
  });

  it("returns a Blob", async () => {
    const { exportApkg } = await import("./anki");
    const cards: AnkiCard[] = [{ front: "Hello", back: "World", tags: [] }];
    const result = await exportApkg(cards);
    expect(result).toBeInstanceOf(Blob);
  });

  it("adds collection.anki21 and media to the zip", async () => {
    const { exportApkg } = await import("./anki");
    await exportApkg([{ front: "Q", back: "A", tags: ["t"] }]);
    const addedFiles = mockZipFileAdd.mock.calls.map(
      (c: unknown[]) => c[0] as string,
    );
    expect(addedFiles).toContain("collection.anki21");
    expect(addedFiles).toContain("media");
  });

  it("exports empty card array without error", async () => {
    const { exportApkg } = await import("./anki");
    await expect(exportApkg([])).resolves.not.toThrow();
  });
});
