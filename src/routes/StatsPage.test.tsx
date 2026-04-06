import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuth } from "../auth/useAuth";
import { I18nProvider } from "../i18n/I18nProvider";
import {
  notifyDailyStatusUpdated,
  reconcileDailyStatus,
} from "../streak/dailyStatus";
import StatsPage from "./StatsPage";

vi.mock("../stats/hooks", () => ({ useStats: vi.fn() }));
vi.mock("../auth/useAuth", () => ({ useAuth: vi.fn() }));
vi.mock("../streak/dailyStatus", () => ({
  getTodayKey: () => "2026-04-05",
  reconcileDailyStatus: vi.fn(),
  notifyDailyStatusUpdated: vi.fn(),
}));

const mockUseAuth = vi.mocked(useAuth);
const mockReconcileDailyStatus = vi.mocked(reconcileDailyStatus);
const mockNotifyDailyStatusUpdated = vi.mocked(notifyDailyStatusUpdated);

const emptyStats = {
  isLoading: false,
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

const renderPage = () =>
  render(
    <I18nProvider>
      <MemoryRouter>
        <StatsPage />
      </MemoryRouter>
    </I18nProvider>,
  );

describe("StatsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({
      user: { id: "user-1" } as never,
      session: null,
      loading: false,
      signInWithProvider: vi.fn(),
      signInWithEmail: vi.fn(),
      signOut: vi.fn(),
    });
    mockReconcileDailyStatus.mockResolvedValue(false);
  });

  it("renders while loading", async () => {
    const { useStats } = vi.mocked(await import("../stats/hooks"));
    useStats.mockReturnValue({ ...emptyStats, isLoading: true });

    renderPage();
    expect(screen.getByText(/chargement|loading/i)).toBeInTheDocument();
  });

  it("renders global stats after load", async () => {
    const { useStats } = vi.mocked(await import("../stats/hooks"));
    useStats.mockReturnValue({
      ...emptyStats,
      global: {
        totalCards: 42,
        dueToday: 5,
        learnedCount: 10,
        reviewsToday: 3,
        successRate7d: 0.75,
      },
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText("42")).toBeInTheDocument();
    });
  });

  it("shows error message when hook returns error", async () => {
    const { useStats } = vi.mocked(await import("../stats/hooks"));
    useStats.mockReturnValue({ ...emptyStats, error: "DB read failed" });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText(/DB read failed/i)).toBeInTheDocument();
    });
  });

  it("renders period toggle buttons", async () => {
    const { useStats } = vi.mocked(await import("../stats/hooks"));
    useStats.mockReturnValue(emptyStats);

    renderPage();

    expect(screen.getByRole("button", { name: "7 jours" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "30 jours" }),
    ).toBeInTheDocument();
  });

  it("calls useStats with selected period when toggled", async () => {
    const { useStats } = vi.mocked(await import("../stats/hooks"));
    useStats.mockReturnValue(emptyStats);

    renderPage();

    fireEvent.click(screen.getByRole("button", { name: "30 jours" }));

    await waitFor(() => {
      expect(useStats).toHaveBeenCalledWith(30);
    });
  });

  it("renders tag tree when tagAgg is populated", async () => {
    const { useStats } = vi.mocked(await import("../stats/hooks"));
    useStats.mockReturnValue({
      ...emptyStats,
      tagAgg: {
        geo: {
          tagPath: "geo",
          cardsCount: 5,
          dueCount: 1,
          successRate: 0.8,
          avgBox: 2,
          learnedCount: 1,
        },
        "geo/europe": {
          tagPath: "geo/europe",
          cardsCount: 3,
          dueCount: 0,
          successRate: null,
          avgBox: 3,
          learnedCount: 0,
        },
      },
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText("geo")).toBeInTheDocument();
    });
  });

  it("tries to reconcile daily status when stats show reviews today", async () => {
    const { useStats } = vi.mocked(await import("../stats/hooks"));
    mockReconcileDailyStatus.mockResolvedValue(true);
    useStats.mockReturnValue({
      ...emptyStats,
      global: {
        ...emptyStats.global,
        reviewsToday: 12,
      },
    });

    renderPage();

    await waitFor(() => {
      expect(mockReconcileDailyStatus).toHaveBeenCalledWith(
        "user-1",
        "2026-04-05",
      );
    });
    expect(mockNotifyDailyStatusUpdated).toHaveBeenCalled();
  });
});
