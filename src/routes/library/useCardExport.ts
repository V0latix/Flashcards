import { useI18n } from "../../i18n/useI18n";
import db from "../../db";
import {
  blobToBase64,
  downloadJson,
  type ExportMedia,
  type ExportPayload,
} from "../../utils/export";
import type { Card, ReviewState } from "../../db/types";

export function useCardExport(
  filteredCards: Array<{ card: Card; reviewState?: ReviewState }>,
  selectedCardIds: number[],
  selectedTag: string | null,
  setExportStatus: (status: string) => void,
) {
  const { t } = useI18n();

  const handleExportSelection = async () => {
    if (selectedCardIds.length === 0) return;
    setExportStatus(t("importExport.exportInProgress"));
    try {
      const deckCardIds = new Set(selectedCardIds);
      const [media, reviewLogs] = await Promise.all([
        db.media.where("card_id").anyOf(selectedCardIds).toArray(),
        db.reviewLogs.where("card_id").anyOf(selectedCardIds).toArray(),
      ]);

      const exportMedia: ExportMedia[] = [];
      for (const item of media) {
        const base64 = await blobToBase64(item.blob);
        exportMedia.push({
          card_id: item.card_id,
          side: item.side,
          mime: item.mime,
          base64,
        });
      }

      const payload: ExportPayload = {
        schema_version: 1,
        cards: filteredCards.map(({ card }) => card),
        reviewStates: filteredCards
          .map(({ reviewState }) => reviewState)
          .filter((state): state is ReviewState => Boolean(state)),
        media: exportMedia,
        reviewLogs: reviewLogs.filter((log) => deckCardIds.has(log.card_id)),
      };

      const safeTagName = selectedTag
        ? selectedTag.replaceAll("/", "-")
        : "all";
      downloadJson(payload, `cards-export-${safeTagName}.json`);
      setExportStatus(t("importExport.exportDone"));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setExportStatus(t("library.exportFailed", { message }));
    }
  };

  return { handleExportSelection };
}
