import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { I18nProvider } from "../i18n/I18nProvider";
import ShareDeckModal from "./ShareDeckModal";

const renderModal = (
  onConfirm = vi.fn<[string], Promise<string>>(),
  onClose = vi.fn(),
  cardCount = 3,
) =>
  render(
    <I18nProvider>
      <ShareDeckModal
        cardCount={cardCount}
        onConfirm={onConfirm}
        onClose={onClose}
      />
    </I18nProvider>,
  );

describe("ShareDeckModal", () => {
  it("renders with card count chip", () => {
    renderModal();
    expect(screen.getByText(/3 carte\(s\)/i)).toBeInTheDocument();
  });

  it("confirm button is disabled while title is empty", () => {
    renderModal();
    expect(
      screen.getByRole("button", { name: /créer le lien/i }),
    ).toBeDisabled();
  });

  it("calls onConfirm with trimmed title and shows the returned link", async () => {
    const onConfirm = vi
      .fn<[string], Promise<string>>()
      .mockResolvedValue("https://example.com/share/abc");
    renderModal(onConfirm);

    await userEvent.type(
      screen.getByRole("textbox", { name: /titre/i }),
      "Mon deck",
    );
    await userEvent.click(
      screen.getByRole("button", { name: /créer le lien/i }),
    );

    await waitFor(() =>
      expect(
        screen.getByDisplayValue("https://example.com/share/abc"),
      ).toBeInTheDocument(),
    );
    expect(onConfirm).toHaveBeenCalledWith("Mon deck");
  });

  it("shows error message when onConfirm throws and confirm button stays enabled for retry", async () => {
    const onConfirm = vi
      .fn<[string], Promise<string>>()
      .mockRejectedValue(new Error("Network error"));
    renderModal(onConfirm);

    await userEvent.type(
      screen.getByRole("textbox", { name: /titre/i }),
      "Deck",
    );
    await userEvent.click(
      screen.getByRole("button", { name: /créer le lien/i }),
    );

    await screen.findByText(/network error/i);
    expect(
      screen.getByRole("button", { name: /créer le lien/i }),
    ).not.toBeDisabled();
  });

  it("calls onClose when cancel is clicked", async () => {
    const onClose = vi.fn();
    renderModal(vi.fn(), onClose);
    await userEvent.click(screen.getByRole("button", { name: /annuler/i }));
    expect(onClose).toHaveBeenCalled();
  });

  it("calls onClose when backdrop is clicked", async () => {
    const onClose = vi.fn();
    renderModal(vi.fn(), onClose);
    await userEvent.click(screen.getByRole("dialog"));
    expect(onClose).toHaveBeenCalled();
  });

  it("Enter key submits the form (via form onSubmit)", async () => {
    const onConfirm = vi
      .fn<[string], Promise<string>>()
      .mockResolvedValue("https://example.com/share/x");
    renderModal(onConfirm);

    const input = screen.getByRole("textbox", { name: /titre/i });
    await userEvent.type(input, "Test{Enter}");

    await waitFor(() => expect(onConfirm).toHaveBeenCalledTimes(1));
    expect(onConfirm).toHaveBeenCalledWith("Test");
  });

  it("rapid Enter presses do not create duplicate decks (re-entrancy guard)", async () => {
    let resolveFirst!: (v: string) => void;
    const onConfirm = vi.fn<[string], Promise<string>>(
      () =>
        new Promise<string>((res) => {
          resolveFirst = res;
        }),
    );
    renderModal(onConfirm);

    const input = screen.getByRole("textbox", { name: /titre/i });
    await userEvent.type(input, "Deck");

    // Click the button three times rapidly while first request is pending
    const btn = screen.getByRole("button", { name: /créer le lien/i });
    await userEvent.click(btn);
    await userEvent.click(btn);
    await userEvent.click(btn);

    // Resolve the first (and only) pending request
    resolveFirst("https://example.com/share/once");
    await screen.findByDisplayValue("https://example.com/share/once");

    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("copy button updates label after successful copy", async () => {
    const onConfirm = vi
      .fn<[string], Promise<string>>()
      .mockResolvedValue("https://example.com/share/xyz");
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
    renderModal(onConfirm);

    await userEvent.type(
      screen.getByRole("textbox", { name: /titre/i }),
      "Test",
    );
    await userEvent.click(
      screen.getByRole("button", { name: /créer le lien/i }),
    );
    await screen.findByDisplayValue("https://example.com/share/xyz");

    await userEvent.click(screen.getByRole("button", { name: /copier/i }));
    await screen.findByRole("button", { name: /copié/i });
  });

  it("shows copy error message when clipboard write is rejected", async () => {
    const onConfirm = vi
      .fn<[string], Promise<string>>()
      .mockResolvedValue("https://example.com/share/fail");
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockRejectedValue(new Error("Permission denied")),
      },
    });
    renderModal(onConfirm);

    await userEvent.type(
      screen.getByRole("textbox", { name: /titre/i }),
      "Deck",
    );
    await userEvent.click(
      screen.getByRole("button", { name: /créer le lien/i }),
    );
    await screen.findByDisplayValue("https://example.com/share/fail");

    await userEvent.click(screen.getByRole("button", { name: /copier/i }));
    await screen.findByText(/impossible de copier/i);

    // Copy button should still be available for retry
    expect(screen.getByRole("button", { name: /copier/i })).toBeInTheDocument();
  });
});
