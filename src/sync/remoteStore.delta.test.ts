import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock Supabase client
const mockRange = vi.fn();
const mockGte = vi.fn();
const mockOrder = vi.fn();
const mockEq = vi.fn();
const mockSelect = vi.fn();
const mockFrom = vi.fn();

const buildQuery = () => {
  const q = {
    select: mockSelect,
    eq: mockEq,
    order: mockOrder,
    range: mockRange,
    gte: mockGte,
  };
  mockSelect.mockReturnValue(q);
  mockEq.mockReturnValue(q);
  mockOrder.mockReturnValue(q);
  mockRange.mockResolvedValue({ data: [], error: null });
  mockGte.mockReturnValue(q);
  return q;
};

vi.mock("../supabase/client", () => ({
  supabase: {
    from: mockFrom,
  },
}));

describe("remoteStore — delta sync (since param)", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    const tableQuery = buildQuery();
    mockFrom.mockImplementation((table: string) => {
      if (table === "user_settings") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: vi
                .fn()
                .mockResolvedValue({ data: null, error: null }),
            }),
          }),
        };
      }
      return tableQuery;
    });
  });

  it("calls .gte(updated_at, since) on user_cards when since is provided", async () => {
    const { fetchRemoteSnapshot } = await import("./remoteStore");
    const since = "2026-01-01T00:00:00.000Z";
    await fetchRemoteSnapshot("user-1", since);
    expect(mockGte).toHaveBeenCalledWith("updated_at", since);
  });

  it("does NOT call .gte when since is null (full snapshot)", async () => {
    vi.resetModules();
    const tableQuery = buildQuery();
    mockFrom.mockImplementation((table: string) => {
      if (table === "user_settings") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: vi
                .fn()
                .mockResolvedValue({ data: null, error: null }),
            }),
          }),
        };
      }
      return tableQuery;
    });
    const { fetchRemoteSnapshot } = await import("./remoteStore");
    await fetchRemoteSnapshot("user-1", null);
    expect(mockGte).not.toHaveBeenCalled();
  });
});
