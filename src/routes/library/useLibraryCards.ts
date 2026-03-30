import { useCallback, useEffect, useState } from "react";
import { listCardsWithReviewState } from "../../db/queries";
import type { Card, ReviewState } from "../../db/types";

export function useLibraryCards() {
  const [cards, setCards] = useState<
    Array<{ card: Card; reviewState?: ReviewState }>
  >([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadCards = useCallback(async () => {
    const data = await listCardsWithReviewState(0);
    setCards(data);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadCards();
  }, [loadCards]);

  return { cards, isLoading, loadCards };
}
