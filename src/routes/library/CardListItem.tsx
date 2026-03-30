import { Link } from "react-router-dom";
import MarkdownRenderer from "../../components/MarkdownRenderer";
import { useI18n } from "../../i18n/useI18n";
import type { Card, ReviewState } from "../../db/types";

type Props = {
  card: Card;
  reviewState: ReviewState | undefined;
  openHints: Record<number, boolean>;
  formatDueDate: (value: string | null | undefined) => string;
  onToggleHint: (cardId: number) => void;
  onToggleSuspended: (card: Card) => void;
  onDelete: (card: Card) => void;
};

function CardListItem({
  card,
  reviewState,
  openHints,
  formatDueDate,
  onToggleHint,
  onToggleSuspended,
  onDelete,
}: Props) {
  const { t } = useI18n();

  return (
    <li className="card list-item">
      <Link to={`/card/${card.id}/edit`} className="markdown">
        <MarkdownRenderer
          value={card.front_md || `*${t("library.noFront")}*`}
        />
      </Link>
      <div className="chip">
        {t("labels.box")} {reviewState?.box ?? 0}
      </div>
      {card.suspended ? (
        <div className="chip">{t("labels.suspended")}</div>
      ) : null}
      <p>
        {t("labels.nextReview")}: {formatDueDate(reviewState?.due_date)}
      </p>
      {card.hint_md ? (
        <div className="section">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => onToggleHint(card.id ?? 0)}
          >
            {openHints[card.id ?? 0]
              ? t("labels.hideHint")
              : t("labels.showHint")}
          </button>
          {openHints[card.id ?? 0] ? (
            <div className="markdown">
              <MarkdownRenderer value={card.hint_md} />
            </div>
          ) : null}
        </div>
      ) : null}
      <button
        type="button"
        className="btn btn-secondary"
        onClick={() => onToggleSuspended(card)}
      >
        {card.suspended ? t("actions.resumeCard") : t("actions.suspendCard")}
      </button>
      <button
        type="button"
        className="btn btn-secondary"
        onClick={() => onDelete(card)}
      >
        {t("actions.delete")}
      </button>
    </li>
  );
}

export default CardListItem;
