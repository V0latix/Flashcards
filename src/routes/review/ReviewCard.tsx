import { Link } from "react-router-dom";
import MarkdownRenderer from "../../components/MarkdownRenderer";
import ConfirmDialog from "../../components/ConfirmDialog";
import { useI18n } from "../../i18n/useI18n";
import type { SessionCard } from "./types";

const preloadStyle: React.CSSProperties = {
  position: "absolute",
  left: "-99999px",
  top: 0,
  width: 1,
  height: 1,
  overflow: "hidden",
};

type Props = {
  currentCard: SessionCard;
  nextCard: SessionCard | undefined;
  isTraining: boolean;
  tagFilter: string | null;
  selectedBox: number | null;
  showBack: boolean;
  showHint: boolean;
  hasHint: boolean;
  reviewedCount: number;
  remainingCount: number;
  progressPercent: number;
  totalCards: number;
  frontMarkdownRef: React.RefObject<HTMLDivElement | null>;
  backMarkdownRef: React.RefObject<HTMLDivElement | null>;
  isDeleteOpen: boolean;
  setIsDeleteOpen: (open: boolean) => void;
  isDeleting: boolean;
  isSuspending: boolean;
  handleReveal: () => void;
  handleAnswer: (result: "good" | "bad") => void | Promise<void>;
  setShowHint: React.Dispatch<React.SetStateAction<boolean>>;
  handleDelete: () => void | Promise<void>;
  handleSuspend: () => void | Promise<void>;
  canUndo: boolean;
  handleUndo: () => void | Promise<void>;
};

function ReviewCard({
  currentCard,
  nextCard,
  isTraining,
  tagFilter,
  selectedBox,
  showBack,
  showHint,
  hasHint,
  reviewedCount,
  remainingCount,
  progressPercent,
  totalCards,
  frontMarkdownRef,
  backMarkdownRef,
  isDeleteOpen,
  setIsDeleteOpen,
  isDeleting,
  isSuspending,
  handleReveal,
  handleAnswer,
  setShowHint,
  handleDelete,
  handleSuspend,
  canUndo,
  handleUndo,
}: Props) {
  const { t } = useI18n();

  return (
    <section className="card section review-session">
      <div className="review-session-meta">
        {isTraining ? (
          <p className="review-session-mode">{t("review.trainingMode")}</p>
        ) : null}
        {currentCard.tags.length > 0 ? (
          <div className="review-tags" aria-label={t("labels.tags")}>
            <span className="chip">{currentCard.tags.join(" · ")}</span>
          </div>
        ) : null}
        {tagFilter ? (
          <p>
            {t("library.tag")}: {tagFilter}
          </p>
        ) : null}
        {selectedBox !== null ? (
          <p>
            {t("labels.box")}: {selectedBox}
          </p>
        ) : null}
      </div>

      <div className="review-progress" aria-label={t("review.progress")}>
        <div className="review-progress-head">
          <p className="review-progress-title">{t("review.progress")}</p>
          <p className="review-progress-count">
            {t("review.remaining", { count: remainingCount })}
          </p>
        </div>
        <div
          className="review-progress-track"
          role="progressbar"
          aria-label={t("review.progress")}
          aria-valuemin={0}
          aria-valuemax={totalCards}
          aria-valuenow={reviewedCount}
        >
          <span
            className="review-progress-fill"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      <div className="review-session-shell">
        <div
          className={
            showBack
              ? "review-card-stack review-card-stack-revealed"
              : "review-card-stack"
          }
        >
          <article className="review-face">
            <h2>{t("cardEditor.front")}</h2>
            <div className="markdown" ref={frontMarkdownRef}>
              <MarkdownRenderer
                value={currentCard.front || t("status.none")}
                imageLoading="eager"
                imageFetchPriority="high"
              />
            </div>
            {hasHint && showHint ? (
              <div className="review-hint">
                <h3>{t("labels.hint")}</h3>
                <div className="markdown">
                  <MarkdownRenderer
                    value={currentCard.hint ?? t("status.none")}
                    imageLoading="eager"
                    imageFetchPriority="high"
                  />
                </div>
              </div>
            ) : null}
          </article>
          {showBack ? (
            <article className="review-face">
              <h2>{t("cardEditor.back")}</h2>
              <div className="markdown" ref={backMarkdownRef}>
                <MarkdownRenderer
                  value={currentCard.back || t("status.none")}
                  imageLoading="eager"
                  imageFetchPriority="high"
                />
              </div>
            </article>
          ) : null}
        </div>
        <aside className="review-session-actions">
          {!showBack ? (
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleReveal}
            >
              {t("review.revealBack")}
            </button>
          ) : (
            <div className="review-answer-buttons">
              <button
                type="button"
                style={{ order: 1 }}
                className="btn btn-primary"
                onClick={() => handleAnswer("good")}
              >
                {t("review.good")}
              </button>
              <button
                type="button"
                style={{ order: 2 }}
                className="btn btn-secondary"
                onClick={() => handleAnswer("bad")}
              >
                {t("review.bad")}
              </button>
            </div>
          )}
          {hasHint ? (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setShowHint((prev) => !prev)}
              aria-keyshortcuts="H"
            >
              {showHint ? t("labels.hideHint") : t("labels.showHint")}
            </button>
          ) : null}
          {canUndo ? (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => void handleUndo()}
              aria-keyshortcuts="Z"
            >
              {t("review.undo")}
            </button>
          ) : null}
          {showBack ? (
            <Link
              to={`/card/${currentCard.cardId}/edit`}
              className="btn btn-secondary"
            >
              {t("review.editCard")}
            </Link>
          ) : null}
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => void handleSuspend()}
            disabled={isSuspending || isDeleting}
          >
            {t("actions.suspendCard")}
          </button>
          <button
            type="button"
            className="btn btn-danger"
            onClick={() => setIsDeleteOpen(true)}
          >
            {t("review.deleteCard")}
          </button>
        </aside>
      </div>

      {/* Preload back (KaTeX + images) so reveal is instant. */}
      {!showBack ? (
        <div aria-hidden="true" style={preloadStyle}>
          <div className="markdown">
            <MarkdownRenderer
              value={currentCard.back || t("status.none")}
              imageLoading="eager"
              imageFetchPriority="high"
            />
          </div>
        </div>
      ) : null}
      {/* Preload next card (front + back) during current card. */}
      {nextCard ? (
        <div aria-hidden="true" style={preloadStyle}>
          <div className="markdown">
            <MarkdownRenderer
              value={nextCard.front || t("status.none")}
              imageLoading="eager"
              imageFetchPriority="high"
            />
          </div>
          <div className="markdown">
            <MarkdownRenderer
              value={nextCard.back || t("status.none")}
              imageLoading="eager"
              imageFetchPriority="high"
            />
          </div>
        </div>
      ) : null}
      <ConfirmDialog
        open={isDeleteOpen}
        title={t("actions.delete")}
        message={t("review.confirmDelete")}
        confirmLabel={t("review.confirmDeleteYes")}
        onConfirm={handleDelete}
        onCancel={() => setIsDeleteOpen(false)}
        isDanger
        confirmDisabled={isDeleting}
      />
    </section>
  );
}

export default ReviewCard;
