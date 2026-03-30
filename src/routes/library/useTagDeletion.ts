import { useMemo, useState } from "react";
import { deleteCardsByTag } from "../../db/queries";
import type { Card, ReviewState } from "../../db/types";

export function useTagDeletion(
  cards: Array<{ card: Card; reviewState?: ReviewState }>,
  selectedTag: string | null,
  onSuccess: () => Promise<void>,
) {
  const [tagDeleteOpen, setTagDeleteOpen] = useState(false);
  const [includeSubTags, setIncludeSubTags] = useState(true);
  const [isTagDeleting, setIsTagDeleting] = useState(false);

  const tagDeleteCount = useMemo(() => {
    if (!selectedTag) return 0;
    return cards.filter(({ card }) =>
      includeSubTags
        ? card.tags.some(
            (tag) => tag === selectedTag || tag.startsWith(`${selectedTag}/`),
          )
        : card.tags.some((tag) => tag === selectedTag),
    ).length;
  }, [cards, includeSubTags, selectedTag]);

  const openTagDelete = () => {
    if (!selectedTag) return;
    setTagDeleteOpen(true);
  };

  const handleDeleteByTag = async () => {
    if (!selectedTag || isTagDeleting) return;
    setIsTagDeleting(true);
    await deleteCardsByTag(selectedTag, includeSubTags);
    await onSuccess();
    setIsTagDeleting(false);
    setTagDeleteOpen(false);
  };

  return {
    tagDeleteOpen,
    setTagDeleteOpen,
    includeSubTags,
    setIncludeSubTags,
    isTagDeleting,
    tagDeleteCount,
    openTagDelete,
    handleDeleteByTag,
  };
}
