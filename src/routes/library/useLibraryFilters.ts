import { useMemo, useState } from "react";
import type { Card, ReviewState } from "../../db/types";

const SUSPENDED_BOX = -1;

export function useLibraryFilters(
  cards: Array<{ card: Card; reviewState?: ReviewState }>,
  onFilterChange?: () => void,
) {
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [selectedBoxes, setSelectedBoxes] = useState<number[]>([]);
  const [visibleCount, setVisibleCount] = useState(100);

  const handleSelectTag = (tag: string | null) => {
    setSelectedTag(tag);
    setVisibleCount(100);
    onFilterChange?.();
  };

  const toggleBoxFilter = (box: number) => {
    setSelectedBoxes((prev) => {
      const next = prev.includes(box)
        ? prev.filter((item) => item !== box)
        : [...prev, box];
      return next.sort((a, b) => a - b);
    });
    setVisibleCount(100);
    onFilterChange?.();
  };

  const clearBoxFilter = () => {
    setSelectedBoxes([]);
    setVisibleCount(100);
    onFilterChange?.();
  };

  const handleQueryChange = (value: string) => {
    setQuery(value);
    setVisibleCount(100);
    onFilterChange?.();
  };

  const handleGoUp = () => {
    if (!selectedTag) return;
    const parts = selectedTag.split("/");
    if (parts.length <= 1) {
      handleSelectTag(null);
      return;
    }
    handleSelectTag(parts.slice(0, -1).join("/"));
  };

  const boxCounts = useMemo(() => {
    const counts: Record<number, number> = {
      0: 0,
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0,
    };
    cards.forEach(({ reviewState }) => {
      const box = reviewState?.box ?? 0;
      if (typeof counts[box] === "number") {
        counts[box] += 1;
      }
    });
    return counts;
  }, [cards]);

  const suspendedCount = useMemo(
    () => cards.filter(({ card }) => card.suspended).length,
    [cards],
  );

  const filteredCards = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return cards.filter(({ card, reviewState }) => {
      if (selectedTag) {
        const hasTag = card.tags.some((tag) => {
          const normalized = tag.trim();
          return (
            normalized === selectedTag ||
            normalized.startsWith(`${selectedTag}/`)
          );
        });
        if (!hasTag) return false;
      }

      if (selectedBoxes.length > 0) {
        const selectedActiveBoxes = selectedBoxes.filter(
          (box) => box !== SUSPENDED_BOX,
        );
        const includeSuspended = selectedBoxes.includes(SUSPENDED_BOX);
        if (card.suspended) {
          if (!includeSuspended) return false;
        } else {
          const cardBox = reviewState?.box ?? 0;
          if (
            selectedActiveBoxes.length === 0 ||
            !selectedActiveBoxes.includes(cardBox)
          ) {
            return false;
          }
        }
      }

      if (normalizedQuery) {
        const haystack =
          `${card.front_md} ${card.back_md} ${card.tags.join(" ")}`.toLowerCase();
        if (!haystack.includes(normalizedQuery)) return false;
      }

      return true;
    });
  }, [cards, query, selectedBoxes, selectedTag]);

  const visibleCards = useMemo(
    () => filteredCards.slice(0, visibleCount),
    [filteredCards, visibleCount],
  );

  const selectedCardIds = useMemo(
    () =>
      filteredCards
        .map(({ card }) => card.id)
        .filter((id): id is number => typeof id === "number"),
    [filteredCards],
  );

  const filteredSuspendedCount = useMemo(
    () => filteredCards.filter(({ card }) => card.suspended).length,
    [filteredCards],
  );

  const filteredActiveCount = filteredCards.length - filteredSuspendedCount;

  const trainingCardIds = useMemo(
    () =>
      filteredCards
        .filter(({ card }) => !card.suspended)
        .map(({ card }) => card.id)
        .filter((id): id is number => typeof id === "number"),
    [filteredCards],
  );

  const breadcrumbParts = selectedTag ? selectedTag.split("/") : [];
  const breadcrumbPaths = breadcrumbParts.map((_, index) =>
    breadcrumbParts.slice(0, index + 1).join("/"),
  );

  return {
    selectedTag,
    query,
    selectedBoxes,
    visibleCount,
    setVisibleCount,
    boxCounts,
    suspendedCount,
    filteredCards,
    visibleCards,
    selectedCardIds,
    filteredSuspendedCount,
    filteredActiveCount,
    trainingCardIds,
    breadcrumbParts,
    breadcrumbPaths,
    handleSelectTag,
    toggleBoxFilter,
    clearBoxFilter,
    handleQueryChange,
    handleGoUp,
  };
}
