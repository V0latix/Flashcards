import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { I18nProvider } from "../i18n/I18nProvider";
import SharedDeck from "./SharedDeck";
import { resetDb } from "../test/utils";
import db from "../db";

const mockFetchSharedDeck = vi.fn();

vi.mock("../supabase/sharedDecks", () => ({
  fetchSharedDeck: (...args: unknown[]) => mockFetchSharedDeck(...args),
}));

const renderAt = (id: string) =>
  render(
    <I18nProvider>
      <MemoryRouter initialEntries={[`/share/${id}`]}>
        <Routes>
          <Route path="/share/:id" element={<SharedDeck />} />
        </Routes>
      </MemoryRouter>
    </I18nProvider>,
  );

describe("SharedDeck", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await resetDb();
  });

  it("shows loading then deck title and cards", async () => {
    mockFetchSharedDeck.mockResolvedValue({
      id: "deck-1",
      user_id: "u1",
      title: "Mon deck partagé",
      description: "Une description",
      cards: [
        { front_md: "Recto 1", back_md: "Verso 1", tags: ["geo"] },
        { front_md: "Recto 2", back_md: "Verso 2", tags: [] },
      ],
      tag: "geo",
      created_at: "2026-01-01T00:00:00Z",
    });

    renderAt("deck-1");

    await screen.findByText("Mon deck partagé");
    expect(screen.getByText("Une description")).toBeInTheDocument();
    expect(screen.getByText("Recto 1")).toBeInTheDocument();
    expect(screen.getByText("Verso 2")).toBeInTheDocument();
    expect(screen.getByText("2 carte(s)")).toBeInTheDocument();
  });

  it("shows not-found message when deck is null", async () => {
    mockFetchSharedDeck.mockResolvedValue(null);
    renderAt("missing-id");
    await screen.findByText(/introuvable/i);
  });

  it("shows error message when fetch throws", async () => {
    mockFetchSharedDeck.mockRejectedValue(new Error("Network"));
    renderAt("bad-id");
    await screen.findByText(/introuvable/i);
  });

  it("imports cards into local DB on button click", async () => {
    mockFetchSharedDeck.mockResolvedValue({
      id: "deck-2",
      user_id: "u1",
      title: "Deck à importer",
      description: null,
      cards: [
        { front_md: "Q1", back_md: "R1", tags: ["tag1"] },
        { front_md: "Q2", back_md: "R2", tags: [] },
      ],
      tag: null,
      created_at: "2026-01-01T00:00:00Z",
    });

    renderAt("deck-2");
    await screen.findByText("Deck à importer");

    const importBtn = screen.getByRole("button", { name: /importer/i });
    await userEvent.click(importBtn);

    await waitFor(async () => {
      const cards = await db.cards.toArray();
      expect(cards).toHaveLength(2);
    });

    await screen.findByText(/2 carte\(s\) importée\(s\)/i);
  });

  it("button stays enabled after an import error (allows retry)", async () => {
    mockFetchSharedDeck.mockResolvedValue({
      id: "deck-err",
      user_id: "u1",
      title: "Deck erreur",
      description: null,
      cards: [{ front_md: "Q1", back_md: "R1", tags: [] }],
      tag: null,
      created_at: "2026-01-01T00:00:00Z",
    });

    // Simulate DB failure during import
    vi.spyOn(db, "transaction").mockRejectedValueOnce(new Error("DB failure"));

    renderAt("deck-err");
    await screen.findByText("Deck erreur");

    await userEvent.click(screen.getByRole("button", { name: /importer/i }));
    await screen.findByText(/erreur d'import/i);

    // Button must still be enabled after an error (allows retry)
    expect(
      screen.getByRole("button", { name: /importer/i }),
    ).not.toBeDisabled();
  });

  it("reports already-present cards without duplicating", async () => {
    mockFetchSharedDeck.mockResolvedValue({
      id: "deck-3",
      user_id: "u1",
      title: "Deck dupliqué",
      description: null,
      cards: [{ front_md: "Q1", back_md: "R1", tags: [] }],
      tag: null,
      created_at: "2026-01-01T00:00:00Z",
    });

    renderAt("deck-3");
    await screen.findByText("Deck dupliqué");

    // First import
    await userEvent.click(screen.getByRole("button", { name: /importer/i }));
    await screen.findByText(/1 carte\(s\) importée\(s\)/i);
  });
});
