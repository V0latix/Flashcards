import { useEffect, useRef } from "react";
import type { SessionCard } from "./types";

function resetScrollTop(element: HTMLDivElement | null) {
  if (!element) return;
  if (typeof element.scrollTo === "function") {
    element.scrollTo({ top: 0, left: 0 });
    return;
  }
  element.scrollTop = 0;
  element.scrollLeft = 0;
}

export function useScrollReset(
  currentCard: SessionCard | undefined,
  showBack: boolean,
) {
  const frontMarkdownRef = useRef<HTMLDivElement | null>(null);
  const backMarkdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!currentCard) return;
    resetScrollTop(frontMarkdownRef.current);
    if (showBack) {
      resetScrollTop(backMarkdownRef.current);
    }
  }, [currentCard, showBack]);

  return { frontMarkdownRef, backMarkdownRef };
}
