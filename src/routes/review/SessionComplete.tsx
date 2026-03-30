import { Link } from "react-router-dom";
import MarkdownRenderer from "../../components/MarkdownRenderer";
import { useI18n } from "../../i18n/useI18n";
import type { SessionCard } from "./types";

type Props = {
  isTraining: boolean;
  cards: SessionCard[];
  answers: Record<number, "good" | "bad">;
  goodCards: SessionCard[];
  badCards: SessionCard[];
  goodCount: number;
  badCount: number;
};

function SessionComplete({
  isTraining,
  cards,
  answers,
  goodCards,
  badCards,
  goodCount,
  badCount,
}: Props) {
  const { t } = useI18n();

  return (
    <section className="card section">
      <h2>{t("review.completed")}</h2>
      <p>
        {t("labels.total")}: {cards.length} · {t("review.good")}: {goodCount} ·{" "}
        {t("review.bad")}: {badCount}
      </p>
      {isTraining ? (
        <div className="section">
          <h3>{t("review.trainingCards")}</h3>
          {cards.length === 0 ? (
            <p>{t("review.empty")}</p>
          ) : (
            <ul className="card-list">
              {cards.map((card) => (
                <li key={card.cardId} className="card list-item">
                  <div className="markdown">
                    <MarkdownRenderer value={card.front || t("status.none")} />
                  </div>
                  <div className="markdown">
                    <MarkdownRenderer value={card.back || t("status.none")} />
                  </div>
                  <p>
                    {t("stats.rate")}:{" "}
                    {answers[card.cardId] === "good"
                      ? t("review.good")
                      : answers[card.cardId] === "bad"
                        ? t("review.bad")
                        : t("status.none")}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <div className="section">
          <div className="split">
            <div className="panel">
              <h3>{t("review.good")}</h3>
              {goodCards.length === 0 ? (
                <p>{t("review.noGood")}</p>
              ) : (
                <ul className="card-list">
                  {goodCards.map((card) => (
                    <li key={card.cardId} className="card list-item">
                      <div className="markdown">
                        <MarkdownRenderer
                          value={card.front || t("status.none")}
                        />
                      </div>
                      <div className="markdown">
                        <MarkdownRenderer
                          value={card.back || t("status.none")}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="panel">
              <h3>{t("review.bad")}</h3>
              {badCards.length === 0 ? (
                <p>{t("review.noBad")}</p>
              ) : (
                <ul className="card-list">
                  {badCards.map((card) => (
                    <li key={card.cardId} className="card list-item">
                      <div className="markdown">
                        <MarkdownRenderer
                          value={card.front || t("status.none")}
                        />
                      </div>
                      <div className="markdown">
                        <MarkdownRenderer
                          value={card.back || t("status.none")}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
      <Link to="/" className="btn btn-primary">
        {t("review.backHome")}
      </Link>
    </section>
  );
}

export default SessionComplete;
