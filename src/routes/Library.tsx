import { useState } from "react";
import { useNavigate } from "react-router-dom";
import ConfirmDialog from "../components/ConfirmDialog";
import TagTreeFilter from "../components/TagTreeFilter";
import { setCardsSuspended, updateCard } from "../db/queries";
import type { Card } from "../db/types";
import { useI18n } from "../i18n/useI18n";
import { useAuth } from "../auth/useAuth";
import { createSharedDeck } from "../supabase/sharedDecks";
import ShareDeckModal from "../components/ShareDeckModal";
import { saveTrainingQueue } from "../utils/training";
import { useLibraryCards } from "./library/useLibraryCards";
import { useLibraryFilters } from "./library/useLibraryFilters";
import { useCardDeletion } from "./library/useCardDeletion";
import { useTagDeletion } from "./library/useTagDeletion";
import { useCardExport } from "./library/useCardExport";
import BoxFilterBar from "./library/BoxFilterBar";
import CardListItem from "./library/CardListItem";

function Library() {
  const { t, language } = useI18n();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [exportStatus, setExportStatus] = useState("");
  const [openHints, setOpenHints] = useState<Record<number, boolean>>({});
  const [shareOpen, setShareOpen] = useState(false);

  const { cards, isLoading, loadCards } = useLibraryCards();
  const filters = useLibraryFilters(cards, () => setExportStatus(""));
  const { handleExportSelection } = useCardExport(
    filters.filteredCards,
    filters.selectedCardIds,
    filters.selectedTag,
    setExportStatus,
  );
  const cardDeletion = useCardDeletion(loadCards);
  const tagDeletion = useTagDeletion(cards, filters.selectedTag, loadCards);

  const formatDueDate = (value: string | null | undefined) => {
    if (!value) return t("status.none");
    const [year, month, day] = value.split("-").map(Number);
    if (!year || !month || !day) return value;
    const date = new Date(Date.UTC(year, month - 1, day));
    const locale = language === "fr" ? "fr-FR" : "en-US";
    return date.toLocaleDateString(locale, {
      timeZone: "UTC",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const handleTraining = () => {
    if (filters.trainingCardIds.length === 0) return;
    saveTrainingQueue(filters.trainingCardIds);
    navigate("/review?mode=training");
  };

  const handleToggleSuspended = async (card: Card) => {
    if (!card.id) return;
    await updateCard(card.id, { suspended: !card.suspended });
    await loadCards();
  };

  const handleSetSuspendedForFiltered = async (suspended: boolean) => {
    if (filters.selectedCardIds.length === 0) return;
    await setCardsSuspended(filters.selectedCardIds, suspended);
    await loadCards();
  };

  const handleToggleHint = (cardId: number) => {
    setOpenHints((prev) => ({ ...prev, [cardId]: !prev[cardId] }));
  };

  const handleShare = async (title: string): Promise<string> => {
    if (!user) throw new Error(t("sharedDeck.shareLoginRequired"));
    const selectedCards = filters.filteredCards
      .filter(({ card }) => filters.selectedCardIds.includes(card.id ?? -1))
      .map(({ card }) => card);
    const id = await createSharedDeck(
      user.id,
      title,
      selectedCards,
      filters.selectedTag,
    );
    const base = window.location.origin + import.meta.env.BASE_URL;
    return `${base}share/${id}`;
  };

  return (
    <main className="container page">
      <div className="page-header">
        <h1>{t("library.title")}</h1>
        <p>{t("library.subtitle")}</p>
      </div>
      <p>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => navigate("/card/new")}
        >
          {t("actions.addCard")}
        </button>
      </p>
      {isLoading ? (
        <p>{t("status.loading")}</p>
      ) : (
        <section className="card section split">
          <div className="sidebar">
            <TagTreeFilter
              title={t("labels.tags")}
              allLabel={t("library.allCards")}
              noTagsLabel={t("library.noTags")}
              tagsCollection={cards.map(({ card }) => card.tags)}
              onSelectTag={filters.handleSelectTag}
            />
          </div>
          <div className="panel">
            <div className="panel-header">
              <h2>
                {filters.selectedTag
                  ? `${t("library.tag")}: ${filters.selectedTag}`
                  : t("library.allCards")}
              </h2>
              <span className="chip">
                {t("labels.total")}: {cards.length}
              </span>
              {filters.selectedTag ? (
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={filters.handleGoUp}
                >
                  {t("actions.up")}
                </button>
              ) : null}
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleTraining}
                disabled={filters.trainingCardIds.length === 0}
              >
                {t("actions.training")}
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => void handleExportSelection()}
                disabled={filters.selectedCardIds.length === 0}
              >
                {t("library.exportSelection")}
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShareOpen(true)}
                disabled={filters.selectedCardIds.length === 0}
              >
                {t("sharedDeck.shareTitle")}
              </button>
              <BoxFilterBar
                selectedBoxes={filters.selectedBoxes}
                boxCounts={filters.boxCounts}
                suspendedCount={filters.suspendedCount}
                onToggle={filters.toggleBoxFilter}
                onClear={filters.clearBoxFilter}
              />
            </div>
            {filters.selectedTag ? (
              <div className="section">
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={tagDeletion.openTagDelete}
                >
                  {t("library.deleteByTag")}
                </button>
              </div>
            ) : null}
            {filters.selectedCardIds.length > 0 ? (
              <div className="section button-row">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => void handleSetSuspendedForFiltered(true)}
                  disabled={filters.filteredActiveCount === 0}
                >
                  {t("actions.suspendSelection")}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => void handleSetSuspendedForFiltered(false)}
                  disabled={filters.filteredSuspendedCount === 0}
                >
                  {t("actions.resumeSelection")}
                </button>
              </div>
            ) : null}
            {filters.breadcrumbParts.length > 0 ? (
              <div className="breadcrumb">
                {filters.breadcrumbParts.map((part, index) => (
                  <span key={filters.breadcrumbPaths[index]} className="chip">
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() =>
                        filters.handleSelectTag(filters.breadcrumbPaths[index])
                      }
                    >
                      {part}
                    </button>
                  </span>
                ))}
              </div>
            ) : null}
            <label htmlFor="search">{t("labels.search")}</label>
            <input
              id="search"
              type="text"
              value={filters.query}
              className="input"
              onChange={(event) =>
                filters.handleQueryChange(event.target.value)
              }
            />
            {exportStatus ? <p>{exportStatus}</p> : null}
            {filters.filteredCards.length === 0 ? (
              <p>{t("library.noCards")}</p>
            ) : null}
            {filters.filteredCards.length > 0 ? (
              <ul className="card-list">
                {filters.visibleCards.map(({ card, reviewState }) => (
                  <CardListItem
                    key={card.id}
                    card={card}
                    reviewState={reviewState}
                    openHints={openHints}
                    formatDueDate={formatDueDate}
                    onToggleHint={handleToggleHint}
                    onToggleSuspended={handleToggleSuspended}
                    onDelete={cardDeletion.handleDelete}
                  />
                ))}
              </ul>
            ) : null}
            {filters.filteredCards.length > filters.visibleCount ? (
              <button
                type="button"
                className="btn btn-secondary section"
                onClick={() => filters.setVisibleCount((prev) => prev + 100)}
              >
                {t("actions.loadMore")}
              </button>
            ) : null}
          </div>
        </section>
      )}
      <ConfirmDialog
        open={tagDeletion.tagDeleteOpen}
        title={t("library.deleteByTag")}
        message={
          filters.selectedTag
            ? `${t("library.deleteByTag")} "${filters.selectedTag}" ?`
            : t("actions.delete")
        }
        confirmLabel={t("actions.delete")}
        onConfirm={tagDeletion.handleDeleteByTag}
        onCancel={() => tagDeletion.setTagDeleteOpen(false)}
        isDanger
        confirmDisabled={
          tagDeletion.isTagDeleting || tagDeletion.tagDeleteCount === 0
        }
      >
        {filters.selectedTag ? (
          <div className="section">
            <label>
              <input
                type="checkbox"
                checked={tagDeletion.includeSubTags}
                onChange={(event) =>
                  tagDeletion.setIncludeSubTags(event.target.checked)
                }
              />{" "}
              {t("labels.includeSubTags")}
            </label>
            <p>
              {t("labels.total")}: {tagDeletion.tagDeleteCount}
            </p>
          </div>
        ) : null}
      </ConfirmDialog>
      <ConfirmDialog
        open={Boolean(cardDeletion.cardToDelete)}
        title={t("actions.delete")}
        message={t("review.confirmDelete")}
        confirmLabel={t("actions.delete")}
        onConfirm={cardDeletion.confirmDeleteCard}
        onCancel={() => cardDeletion.setCardToDelete(null)}
        isDanger
        confirmDisabled={cardDeletion.isCardDeleting}
      />
      {shareOpen && (
        <ShareDeckModal
          cardCount={filters.selectedCardIds.length}
          onConfirm={handleShare}
          onClose={() => setShareOpen(false)}
        />
      )}
    </main>
  );
}

export default Library;
