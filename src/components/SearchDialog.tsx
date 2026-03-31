import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import db from "../db";
import type { Card } from "../db/types";
import { useI18n } from "../i18n/useI18n";

type Props = {
  open: boolean;
  onClose: () => void;
};

const MAX_RESULTS = 10;

const matchCard = (card: Card, query: string): boolean => {
  const q = query.toLowerCase();
  return (
    card.front_md.toLowerCase().includes(q) ||
    card.back_md.toLowerCase().includes(q) ||
    (card.hint_md ?? "").toLowerCase().includes(q) ||
    card.tags.some((tag) => tag.toLowerCase().includes(q))
  );
};

export default function SearchDialog({ open, onClose }: Props) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Card[]>([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Focus input and reset state when opened
  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => {
      setQuery("");
      setResults([]);
      setActiveIdx(0);
      inputRef.current?.focus();
    }, 0);
    return () => clearTimeout(timer);
  }, [open]);

  // Search on query change
  useEffect(() => {
    const q = query.trim();
    if (!open || q.length < 2) {
      const timer = setTimeout(() => {
        setResults([]);
        setActiveIdx(0);
      }, 0);
      return () => clearTimeout(timer);
    }
    let cancelled = false;
    db.cards
      .filter((card) => !card.suspended && matchCard(card, q))
      .limit(MAX_RESULTS)
      .toArray()
      .then((cards) => {
        if (!cancelled) {
          setResults(cards);
          setActiveIdx(0);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [query, open]);

  const handleSelect = (card: Card) => {
    if (card.id) {
      navigate(`/card/${card.id}/edit`);
    }
    onClose();
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Escape") {
      onClose();
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIdx((prev) => Math.min(prev + 1, results.length - 1));
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIdx((prev) => Math.max(prev - 1, 0));
      return;
    }
    if (event.key === "Enter" && results[activeIdx]) {
      handleSelect(results[activeIdx]);
    }
  };

  if (!open) return null;

  return (
    <div
      className="search-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={t("search.title")}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="search-dialog card">
        <input
          ref={inputRef}
          type="search"
          className="input search-input"
          placeholder={t("search.placeholder")}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          autoComplete="off"
        />
        {results.length > 0 ? (
          <ul className="search-results" role="listbox">
            {results.map((card, idx) => (
              <li
                key={card.id}
                role="option"
                aria-selected={idx === activeIdx}
                className={
                  idx === activeIdx
                    ? "search-result search-result-active"
                    : "search-result"
                }
                onMouseDown={() => handleSelect(card)}
                onMouseEnter={() => setActiveIdx(idx)}
              >
                <span className="search-result-front">
                  {card.front_md.slice(0, 80)}
                </span>
                {card.tags.length > 0 ? (
                  <span className="search-result-tags muted">
                    {card.tags.join(" · ")}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        ) : query.trim().length >= 2 ? (
          <p className="search-empty muted">{t("search.noResults")}</p>
        ) : null}
        <p className="search-hint muted">{t("search.hint")}</p>
      </div>
    </div>
  );
}
