import { useState } from "react";
import { useI18n } from "../i18n/useI18n";

type Props = {
  cardCount: number;
  /** Should create the deck and return the shareable URL. */
  onConfirm: (title: string) => Promise<string>;
  onClose: () => void;
};

function ShareDeckModal({ cardCount, onConfirm, onClose }: Props) {
  const { t } = useI18n();
  const [title, setTitle] = useState("");
  const [link, setLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copyError, setCopyError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleSubmit = async () => {
    // Re-entrancy guard: ignore if already in-flight or link already generated
    if (isCreating || link || !title.trim()) return;
    setIsCreating(true);
    setError(null);
    try {
      const url = await onConfirm(title.trim());
      setLink(url);
    } catch (err) {
      setError(t("sharedDeck.shareError", { message: (err as Error).message }));
    } finally {
      setIsCreating(false);
    }
  };

  const handleCopy = async () => {
    if (!link) return;
    setCopyError(null);
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopyError(t("sharedDeck.shareCopyError"));
    }
  };

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="share-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal share-modal">
        <div className="share-modal-header">
          <h3 id="share-modal-title">{t("sharedDeck.shareTitle")}</h3>
          <button
            type="button"
            className="share-modal-close"
            onClick={onClose}
            aria-label="Fermer"
          >
            ✕
          </button>
        </div>

        <p>
          <span className="chip">
            {t("sharedDeck.cardCount", { count: cardCount })}
          </span>
        </p>

        {!link ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void handleSubmit();
            }}
          >
            <label htmlFor="share-title">
              {t("sharedDeck.shareTitleLabel")}
            </label>
            <input
              id="share-title"
              type="text"
              className="input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("sharedDeck.shareTitleLabel")}
              autoFocus
            />
            {error && <p className="share-modal-error">{error}</p>}
            <div className="button-row">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={onClose}
              >
                {t("sharedDeck.shareCancel")}
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={isCreating || !title.trim()}
              >
                {isCreating
                  ? t("sharedDeck.shareCreating")
                  : t("sharedDeck.shareConfirm")}
              </button>
            </div>
          </form>
        ) : (
          <>
            <p className="share-modal-success">
              ✓ {t("sharedDeck.shareLinkLabel")}
            </p>
            <div className="share-link-row">
              <input
                type="text"
                className="input"
                readOnly
                value={link}
                onFocus={(e) => e.target.select()}
              />
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => void handleCopy()}
              >
                {copied
                  ? t("sharedDeck.shareCopied")
                  : t("sharedDeck.shareCopy")}
              </button>
            </div>
            {copyError && <p className="share-modal-error">{copyError}</p>}
            <div className="button-row">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={onClose}
              >
                {t("sharedDeck.shareCancel")}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default ShareDeckModal;
