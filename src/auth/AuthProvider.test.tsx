import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { I18nProvider } from "../i18n/I18nProvider";
import { AuthProvider } from "./AuthProvider";
import { useAuth } from "./useAuth";
import { supabase } from "../supabase/client";

vi.mock("../supabase/client", () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      onAuthStateChange: vi.fn(),
    },
  },
}));

const mockGetSession = vi.mocked(supabase.auth.getSession);
const mockOnAuthStateChange = vi.mocked(supabase.auth.onAuthStateChange);
const mockUnsubscribe = vi.fn();

const setupMocks = (sessionResult: {
  data: { session: null | { user: { id: string } } };
  error?: { message: string } | null;
}) => {
  mockGetSession.mockResolvedValue(sessionResult as never);
  mockOnAuthStateChange.mockReturnValue({
    data: { subscription: { unsubscribe: mockUnsubscribe } },
  } as never);
};

const ConsumerComponent = () => {
  const { user, loading } = useAuth();
  if (loading) return <p>loading...</p>;
  return <p data-testid="user">{user ? `user:${user.id}` : "no-user"}</p>;
};

const renderWithAuth = () =>
  render(
    <I18nProvider>
      <AuthProvider>
        <ConsumerComponent />
      </AuthProvider>
    </I18nProvider>,
  );

describe("AuthProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows loading while session is being fetched", () => {
    mockGetSession.mockReturnValue(new Promise(() => {}) as never);
    mockOnAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: mockUnsubscribe } },
    } as never);

    renderWithAuth();
    expect(screen.getByText("loading...")).toBeInTheDocument();
  });

  it("exposes null user when session is null", async () => {
    setupMocks({ data: { session: null }, error: null });
    renderWithAuth();

    await waitFor(() => {
      expect(screen.getByTestId("user").textContent).toBe("no-user");
    });
  });

  it("logs error but continues when getSession returns an error", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockGetSession.mockResolvedValue({
      data: { session: null },
      error: { message: "Network request failed" },
    } as never);
    mockOnAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: mockUnsubscribe } },
    } as never);

    renderWithAuth();

    await waitFor(() => {
      expect(screen.getByTestId("user").textContent).toBe("no-user");
    });
    expect(consoleSpy).toHaveBeenCalledWith(
      "Auth session error",
      "Network request failed",
    );
    consoleSpy.mockRestore();
  });

  it("exposes user when session contains user", async () => {
    setupMocks({
      data: { session: { user: { id: "user-123" } } },
      error: null,
    });
    renderWithAuth();

    await waitFor(() => {
      expect(screen.getByTestId("user").textContent).toBe("user:user-123");
    });
  });

  it("unsubscribes from auth state change on unmount", async () => {
    setupMocks({ data: { session: null }, error: null });
    const { unmount } = renderWithAuth();

    await waitFor(() => {
      expect(screen.getByTestId("user")).toBeInTheDocument();
    });

    unmount();
    expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
  });
});
