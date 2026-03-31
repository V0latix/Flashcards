import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { I18nProvider } from "../i18n/I18nProvider";
import { listPublicCardsByPackSlug } from "../supabase/api";
import { importPackToLocal } from "../supabase/import";
import PackDetail from "./PackDetail";

vi.mock("../supabase/api", () => ({
  listPublicCardsByPackSlug: vi.fn(),
}));

vi.mock("../supabase/import", () => ({
  importPackToLocal: vi.fn(),
}));

const mockListCards = vi.mocked(listPublicCardsByPackSlug);
const mockImportPack = vi.mocked(importPackToLocal);

const renderPage = (slug = "test-pack") =>
  render(
    <I18nProvider>
      <MemoryRouter initialEntries={[`/packs/${slug}`]}>
        <Routes>
          <Route path="/packs/:slug" element={<PackDetail />} />
        </Routes>
      </MemoryRouter>
    </I18nProvider>,
  );

describe("PackDetail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows loading state initially", () => {
    mockListCards.mockReturnValue(new Promise(() => {}));

    renderPage();
    expect(screen.getByText(/chargement|loading/i)).toBeInTheDocument();
  });

  it("renders cards after successful load", async () => {
    mockListCards.mockResolvedValue([
      {
        id: "1",
        front_md: "Paris",
        back_md: "France",
        tags: ["geo"],
        pack_slug: "geo",
      },
      {
        id: "2",
        front_md: "Berlin",
        back_md: "Germany",
        tags: ["geo"],
        pack_slug: "geo",
      },
    ]);

    renderPage();

    await waitFor(() => {
      expect(screen.getByText(/Paris/)).toBeInTheDocument();
      expect(screen.getByText(/Berlin/)).toBeInTheDocument();
    });
  });

  it("shows error message when API call fails", async () => {
    mockListCards.mockRejectedValue(new Error("Network error"));

    renderPage();

    await waitFor(() => {
      expect(screen.getByText(/network error/i)).toBeInTheDocument();
    });
  });

  it("filters cards by search query", async () => {
    mockListCards.mockResolvedValue([
      {
        id: "1",
        front_md: "Paris",
        back_md: "France",
        tags: [],
        pack_slug: "geo",
      },
      {
        id: "2",
        front_md: "Berlin",
        back_md: "Germany",
        tags: [],
        pack_slug: "geo",
      },
    ]);

    renderPage();
    await waitFor(() => screen.getByText(/Paris/));

    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "paris" },
    });

    await waitFor(() => {
      expect(screen.getByText(/Paris/)).toBeInTheDocument();
      expect(screen.queryByText(/Berlin/)).not.toBeInTheDocument();
    });
  });

  it("shows import result after successful import", async () => {
    mockListCards.mockResolvedValue([]);
    mockImportPack.mockResolvedValue({ imported: 5, alreadyPresent: 2 });

    renderPage();
    await waitFor(() => {
      expect(screen.queryByText(/chargement|loading/i)).not.toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /importer/i }));

    await waitFor(() => {
      expect(mockImportPack).toHaveBeenCalledWith("test-pack");
      expect(screen.getByText(/5/)).toBeInTheDocument();
    });
  });

  it("shows error message when import fails", async () => {
    mockListCards.mockResolvedValue([]);
    mockImportPack.mockRejectedValue(new Error("Import failed"));

    renderPage();
    await waitFor(() => {
      expect(screen.queryByText(/chargement|loading/i)).not.toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /importer/i }));

    await waitFor(() => {
      expect(screen.getByText(/import failed/i)).toBeInTheDocument();
    });
  });

  it("disables import button while importing", async () => {
    mockListCards.mockResolvedValue([]);
    mockImportPack.mockReturnValue(new Promise(() => {}));

    renderPage();
    await waitFor(() => {
      expect(screen.queryByText(/chargement|loading/i)).not.toBeInTheDocument();
    });

    const importBtn = screen.getByRole("button", { name: /importer/i });
    fireEvent.click(importBtn);

    await waitFor(() => {
      expect(importBtn).toBeDisabled();
    });
  });

  it("contains a back link to /packs", async () => {
    mockListCards.mockResolvedValue([]);

    renderPage();
    await waitFor(() => {
      expect(screen.queryByText(/chargement|loading/i)).not.toBeInTheDocument();
    });

    expect(screen.getByRole("link", { name: /packs/i })).toBeInTheDocument();
  });
});
