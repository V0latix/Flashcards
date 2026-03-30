import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { I18nProvider } from "../i18n/I18nProvider";
import StreakBadge from "./StreakBadge";
import { useAuth } from "../auth/useAuth";
import { supabase } from "../supabase/client";
import { reconcileDailyStatus } from "../streak/dailyStatus";

vi.mock("../auth/useAuth", () => ({ useAuth: vi.fn() }));
vi.mock("../supabase/client", () => ({
  supabase: {
    from: vi.fn(),
  },
}));
vi.mock("../streak/dailyStatus", () => ({
  DAILY_PROGRESS_UPDATED_EVENT: "daily_progress_updated",
  DAILY_STATUS_UPDATED_EVENT: "daily_status_updated",
  getTodayKey: () => "2024-03-15",
  reconcileDailyStatus: vi.fn(),
}));

const mockUseAuth = vi.mocked(useAuth);
const mockFrom = vi.mocked(supabase.from);
const mockReconcile = vi.mocked(reconcileDailyStatus);

const buildQuery = (result: { data: unknown; error: unknown }) => ({
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  lte: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  limit: vi.fn().mockResolvedValue(result),
});

const loggedOutAuth = () =>
  mockUseAuth.mockReturnValue({
    user: null,
    session: null,
    loading: false,
    signInWithProvider: vi.fn(),
    signInWithEmail: vi.fn(),
    signOut: vi.fn(),
  });

const loggedInAuth = (userId = "user-1") =>
  mockUseAuth.mockReturnValue({
    user: { id: userId } as never,
    session: null,
    loading: false,
    signInWithProvider: vi.fn(),
    signInWithEmail: vi.fn(),
    signOut: vi.fn(),
  });

const renderBadge = () =>
  render(
    <I18nProvider>
      <StreakBadge />
    </I18nProvider>,
  );

describe("StreakBadge", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows -- when user is not logged in", async () => {
    loggedOutAuth();

    renderBadge();

    await waitFor(() => {
      expect(screen.getByText("--")).toBeInTheDocument();
    });
  });

  it("shows ... while auth is loading", () => {
    mockUseAuth.mockReturnValue({
      user: null,
      session: null,
      loading: true,
      signInWithProvider: vi.fn(),
      signInWithEmail: vi.fn(),
      signOut: vi.fn(),
    });

    renderBadge();
    expect(screen.getByText("...")).toBeInTheDocument();
  });

  it("shows streak count from Supabase when user is logged in", async () => {
    loggedInAuth();
    mockReconcile.mockResolvedValue(false);
    mockFrom.mockReturnValue(
      buildQuery({
        data: [
          { day: "2024-03-15" },
          { day: "2024-03-14" },
          { day: "2024-03-13" },
        ],
        error: null,
      }) as never,
    );

    renderBadge();

    await waitFor(() => {
      expect(screen.getByText("3")).toBeInTheDocument();
    });
  });

  it("shows 0 and logs error when Supabase query fails", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    loggedInAuth();
    mockReconcile.mockResolvedValue(false);
    mockFrom.mockReturnValue(
      buildQuery({
        data: null,
        error: { message: "connection refused" },
      }) as never,
    );

    renderBadge();

    await waitFor(() => {
      expect(screen.getByText("0")).toBeInTheDocument();
    });
    expect(consoleSpy).toHaveBeenCalledWith(
      "streak query failed",
      "connection refused",
    );
    consoleSpy.mockRestore();
  });

  it("logs error but continues when reconcileDailyStatus throws", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    loggedInAuth();
    mockReconcile.mockRejectedValue(new Error("upsert failed"));
    mockFrom.mockReturnValue(buildQuery({ data: [], error: null }) as never);

    renderBadge();

    await waitFor(() => {
      expect(screen.getByText("0")).toBeInTheDocument();
    });
    expect(consoleSpy).toHaveBeenCalledWith(
      "streak recovery upsert failed",
      "upsert failed",
    );
    consoleSpy.mockRestore();
  });
});
