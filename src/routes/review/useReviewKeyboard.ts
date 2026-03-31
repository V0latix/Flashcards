import { useEffect } from "react";
import type { SessionCard } from "./types";

type HandleAnswer = (result: "good" | "bad") => void | Promise<void>;
type HandleReveal = () => void;

export function useReviewKeyboard(
  currentCard: SessionCard | undefined,
  showBack: boolean,
  hasHint: boolean,
  isLoading: boolean,
  isDone: boolean,
  isDeleteOpen: boolean,
  handleReveal: HandleReveal,
  handleAnswer: HandleAnswer,
  onToggleHint: () => void,
  onUndo?: () => void,
) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat || isLoading || isDone || isDeleteOpen || !currentCard)
        return;

      const target = event.target;
      if (target instanceof HTMLElement) {
        const tagName = target.tagName.toLowerCase();
        if (
          tagName === "input" ||
          tagName === "textarea" ||
          target.isContentEditable
        )
          return;
      }

      const isSpace =
        event.code === "Space" || event.key === " " || event.key === "Spacebar";
      if (!showBack && isSpace) {
        event.preventDefault();
        handleReveal();
        return;
      }

      if (hasHint && event.key.toLowerCase() === "h") {
        event.preventDefault();
        onToggleHint();
        return;
      }

      if (
        onUndo &&
        event.key.toLowerCase() === "z" &&
        !event.ctrlKey &&
        !event.metaKey
      ) {
        event.preventDefault();
        onUndo();
        return;
      }

      if (!showBack) return;

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        void handleAnswer("good");
        return;
      }

      if (event.key === "ArrowRight") {
        event.preventDefault();
        void handleAnswer("bad");
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [
    currentCard,
    handleAnswer,
    handleReveal,
    hasHint,
    isDeleteOpen,
    isDone,
    isLoading,
    onToggleHint,
    onUndo,
    showBack,
  ]);
}
