import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import db from "../db";
import { I18nProvider } from "../i18n/I18nProvider";
import { resetDb } from "../test/utils";
import ImportExport from "./ImportExport";

vi.mock("../sync/queue", () => ({ markLocalChange: vi.fn() }));
vi.mock("../utils/export", async (importOriginal) => {
  const original = await importOriginal<typeof import("../utils/export")>();
  return { ...original, downloadJson: vi.fn() };
});

const renderPage = () =>
  render(
    <I18nProvider>
      <MemoryRouter>
        <ImportExport />
      </MemoryRouter>
    </I18nProvider>,
  );

const uploadJson = (payload: unknown) => {
  const json = JSON.stringify(payload);
  const file = new File([json], "deck.json", { type: "application/json" });
  // jsdom doesn't implement File.prototype.text() — polyfill it
  Object.defineProperty(file, "text", { value: () => Promise.resolve(json) });
  const input = screen.getByLabelText(/importer/i);
  fireEvent.change(input, { target: { files: [file] } });
};

describe("ImportExport", () => {
  beforeEach(async () => {
    await resetDb();
    vi.clearAllMocks();
  });

  it("renders title and action buttons", () => {
    renderPage();
    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /exporter/i }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/importer/i)).toBeInTheDocument();
  });

  it("imports cards from array format and inserts them into DB", async () => {
    renderPage();
    uploadJson([
      { front_md: "Q1", back_md: "A1", tags: ["geo"] },
      { front_md: "Q2", back_md: "A2", tags: [] },
    ]);

    await waitFor(async () => {
      const count = await db.cards.count();
      expect(count).toBe(2);
    });

    await waitFor(() => {
      expect(screen.getByText(/inserted_cards: 2/i)).toBeInTheDocument();
    });
  });

  it("imports cards from object format with schema_version", async () => {
    renderPage();
    uploadJson({
      schema_version: 1,
      cards: [{ front_md: "Paris", back_md: "France", tags: [] }],
      reviewStates: [],
      media: [],
      reviewLogs: [],
    });

    await waitFor(async () => {
      const count = await db.cards.count();
      expect(count).toBe(1);
    });
  });

  it("restores review states when provided", async () => {
    renderPage();
    uploadJson({
      schema_version: 1,
      cards: [{ id: "card-1", front_md: "Q1", back_md: "A1", tags: [] }],
      reviewStates: [{ card_id: "card-1", box: 3, due_date: "2024-06-01" }],
      media: [],
      reviewLogs: [],
    });

    await waitFor(async () => {
      const states = await db.reviewStates.toArray();
      expect(states).toHaveLength(1);
      expect(states[0].box).toBe(3);
    });
  });

  it("skips cards missing front or back and reports them", async () => {
    renderPage();
    uploadJson([
      { front_md: "Q1", back_md: "A1" },
      { back_md: "A2" },
      { front_md: "Q3" },
    ]);

    await waitFor(async () => {
      const count = await db.cards.count();
      expect(count).toBe(1);
    });

    await waitFor(() => {
      expect(screen.getByText(/skipped: 2/i)).toBeInTheDocument();
    });
  });

  it("accepts legacy front/back field names", async () => {
    renderPage();
    uploadJson([{ front: "Question", back: "Answer", tags: ["history"] }]);

    await waitFor(async () => {
      const cards = await db.cards.toArray();
      expect(cards).toHaveLength(1);
      expect(cards[0].front_md).toBe("Question");
    });
  });

  it("shows error message for invalid JSON file", async () => {
    renderPage();
    const file = new File(["not-json!!!"], "bad.json", {
      type: "application/json",
    });
    Object.defineProperty(file, "text", {
      value: () => Promise.resolve("not-json!!!"),
    });
    const input = screen.getByLabelText(/importer/i);
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText(/erreur|error/i)).toBeInTheDocument();
    });
  });

  it("shows error for unsupported schema_version", async () => {
    renderPage();
    uploadJson({ schema_version: 99, cards: [] });

    await waitFor(() => {
      const errors = screen.queryByText(/errors: \d+/i);
      expect(errors).toBeInTheDocument();
    });
  });

  it("calls markLocalChange after successful import", async () => {
    const { markLocalChange } = await import("../sync/queue");
    renderPage();
    uploadJson([{ front_md: "Q", back_md: "A", tags: [] }]);

    await waitFor(async () => {
      expect(await db.cards.count()).toBe(1);
    });
    expect(markLocalChange).toHaveBeenCalled();
  });

  it("exports call downloadJson", async () => {
    const { downloadJson } = await import("../utils/export");
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: /exporter/i }));

    await waitFor(() => {
      expect(downloadJson).toHaveBeenCalledTimes(1);
    });
  });
});
