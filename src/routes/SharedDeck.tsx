import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { fetchSharedDeck, type SharedDeck } from "../supabase/sharedDecks";
import db from "../db";
import { markLocalChange } from "../sync/queue";
import { useI18n } from "../i18n/useI18n";

function SharedDeck() {
  const { t } = useI18n();
  const { id } = useParams<{ id: string }>();
  const [deck, setDeck] = useState<SharedDeck | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [importDone, setImportDone] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  useEffect(() => {
    if (!id) {
      setIsLoading(false);
      return;
    }
    void fetchSharedDeck(id)
      .then((data) => {
        setDeck(data);
      })
      .catch((err: Error) => {
        setError(err.message);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [id]);

  const handleImport = async () => {
    if (!deck) return;
    setIsImporting(true);
    setImportError(null);
    try {
      let imported = 0;
      let alreadyPresent = 0;
      const now = new Date().toISOString();
      await db.transaction("rw", db.cards, db.reviewStates, async () => {
        for (const card of deck.cards) {
          const existing = await db.cards
            .filter(
              (c) => c.front_md === card.front_md && c.back_md === card.back_md,
            )
            .first();
          if (existing) {
            alreadyPresent += 1;
            continue;
          }
          const newCardId = await db.cards.add({
            front_md: card.front_md,
            back_md: card.back_md,
            hint_md: card.hint_md ?? null,
            tags: card.tags ?? [],
            suspended: false,
            created_at: now,
            updated_at: now,
            source: "shared",
            source_type: "manual",
            source_id: null,
            source_ref: deck.id,
            cloud_id: null,
            synced_at: null,
          });
          await db.reviewStates.add({
            card_id: newCardId,
            box: 0,
            due_date: null,
            updated_at: now,
            last_reviewed_at: null,
            is_learned: false,
            learned_at: null,
          });
          imported += 1;
        }
      });
      if (imported > 0) markLocalChange();
      setImportDone(true);
      setImportError(
        t("sharedDeck.importResult", { imported, already: alreadyPresent }),
      );
    } catch (err) {
      setImportError(
        t("sharedDeck.importError", { message: (err as Error).message }),
      );
    } finally {
      setIsImporting(false);
    }
  };

  if (isLoading)
    return (
      <main className="container page">
        <p>{t("status.loading")}</p>
      </main>
    );

  if (error || !deck) {
    return (
      <main className="container page">
        <p>{t("sharedDeck.notFound")}</p>
        <Link to="/" className="btn btn-secondary">
          {t("review.backHome")}
        </Link>
      </main>
    );
  }

  return (
    <main className="container page">
      <div className="page-header">
        <h1>{deck.title}</h1>
        {deck.description && <p>{deck.description}</p>}
        <p>
          <span className="chip">
            {t("sharedDeck.cardCount", { count: deck.cards.length })}
          </span>
          {deck.tag && <span className="chip">{deck.tag}</span>}
        </p>
      </div>
      <div className="section">
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => void handleImport()}
          disabled={isImporting || importDone}
        >
          {isImporting ? t("status.loading") : t("sharedDeck.import")}
        </button>
        <Link
          to="/library"
          className="btn btn-secondary"
          style={{ marginLeft: "0.5rem" }}
        >
          {t("nav.library")}
        </Link>
      </div>
      {importError && <p className="section">{importError}</p>}
      <ul className="card-list section">
        {deck.cards.map((card, index) => (
          <li key={index} className="card-list-item">
            <div>
              <strong>{card.front_md}</strong>
            </div>
            <div
              style={{ color: "var(--color-text-muted)", marginTop: "0.25rem" }}
            >
              {card.back_md}
            </div>
            {card.tags && card.tags.length > 0 && (
              <div style={{ marginTop: "0.25rem" }}>
                {card.tags.map((tag) => (
                  <span
                    key={tag}
                    className="chip"
                    style={{ marginRight: "0.25rem" }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </li>
        ))}
      </ul>
    </main>
  );
}

export default SharedDeck;
