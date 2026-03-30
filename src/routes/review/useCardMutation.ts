import { useState } from "react";
import { deleteCard, updateCard } from "../../db/queries";
import { notifyDailyProgressUpdated } from "../../streak/dailyStatus";
import type { SessionCard } from "./types";

type SetCards = React.Dispatch<React.SetStateAction<SessionCard[]>>;
type SetIndex = React.Dispatch<React.SetStateAction<number>>;
type SetBool = React.Dispatch<React.SetStateAction<boolean>>;
type SetAnswers = React.Dispatch<
  React.SetStateAction<Record<number, "good" | "bad">>
>;

export function useCardMutation(
  currentCard: SessionCard | undefined,
  setCards: SetCards,
  setIndex: SetIndex,
  setShowBack: SetBool,
  setShowHint: SetBool,
  setAnswers: SetAnswers,
) {
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSuspending, setIsSuspending] = useState(false);

  const handleDelete = async () => {
    if (!currentCard || isDeleting) return;
    setIsDeleting(true);
    const targetId = currentCard.cardId;
    await deleteCard(targetId);
    setCards((prev) => {
      const next = prev.filter((card) => card.cardId !== targetId);
      setIndex((prevIndex) =>
        Math.min(prevIndex, Math.max(0, next.length - 1)),
      );
      return next;
    });
    setShowBack(false);
    setShowHint(false);
    setIsDeleting(false);
    setIsDeleteOpen(false);
    notifyDailyProgressUpdated();
  };

  const handleSuspend = async () => {
    if (!currentCard || isSuspending) return;
    setIsSuspending(true);
    const targetId = currentCard.cardId;
    try {
      await updateCard(targetId, { suspended: true });
      setCards((prev) => {
        const next = prev.filter((card) => card.cardId !== targetId);
        setIndex((prevIndex) =>
          Math.min(prevIndex, Math.max(0, next.length - 1)),
        );
        return next;
      });
      setAnswers((prev) => {
        if (!(targetId in prev)) return prev;
        const next = { ...prev };
        delete next[targetId];
        return next;
      });
      setShowBack(false);
      setShowHint(false);
      notifyDailyProgressUpdated();
    } catch (error) {
      console.error("suspend card failed", error);
    } finally {
      setIsSuspending(false);
    }
  };

  return {
    isDeleteOpen,
    setIsDeleteOpen,
    isDeleting,
    handleDelete,
    isSuspending,
    handleSuspend,
  };
}
