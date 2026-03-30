import { useState } from "react";
import { deleteCard } from "../../db/queries";
import type { Card } from "../../db/types";

export function useCardDeletion(onSuccess: () => Promise<void>) {
  const [cardToDelete, setCardToDelete] = useState<Card | null>(null);
  const [isCardDeleting, setIsCardDeleting] = useState(false);

  const handleDelete = (card: Card) => {
    if (!card.id) return;
    setCardToDelete(card);
  };

  const confirmDeleteCard = async () => {
    if (!cardToDelete?.id || isCardDeleting) return;
    setIsCardDeleting(true);
    await deleteCard(cardToDelete.id);
    await onSuccess();
    setIsCardDeleting(false);
    setCardToDelete(null);
  };

  return {
    cardToDelete,
    setCardToDelete,
    isCardDeleting,
    handleDelete,
    confirmDeleteCard,
  };
}
