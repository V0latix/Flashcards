import { useEffect, useState } from "react";
import db from "../../db";
import { buildDailySession } from "../../leitner/engine";
import { getLeitnerSettings } from "../../leitner/settings";
import { loadTrainingQueue } from "./trainingQueue";
import type { SessionCard } from "./types";

function shuffle<T>(input: T[]): T[] {
  const result = [...input];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function useSessionLoader(
  isTraining: boolean,
  selectedBox: number | null,
  tagFilter: string | null,
  today: string,
  onReset: () => void,
) {
  const [isLoading, setIsLoading] = useState(true);
  const [sessionCardCount, setSessionCardCount] = useState(0);
  const [cards, setCards] = useState<SessionCard[]>([]);

  useEffect(() => {
    let isCancelled = false;

    const loadSession = async () => {
      setIsLoading(true);
      setCards([]);
      setSessionCardCount(0);
      onReset();

      const { reverseProbability } = getLeitnerSettings();
      let nextCards: SessionCard[] = [];

      if (isTraining) {
        const ids = loadTrainingQueue();
        if (ids.length === 0) {
          if (isCancelled) return;
          setCards([]);
          setIsLoading(false);
          return;
        }
        const rawCards = await db.cards.bulkGet(ids);
        const queue = rawCards
          .filter(
            (card): card is NonNullable<typeof card> =>
              card !== undefined &&
              card !== null &&
              Boolean(card.id) &&
              !card.suspended,
          )
          .map((card) => {
            const isReversed = Math.random() < reverseProbability;
            return {
              cardId: card.id ?? 0,
              front: isReversed ? card.back_md : card.front_md,
              back: isReversed ? card.front_md : card.back_md,
              hint: card.hint_md ?? null,
              tags: card.tags ?? [],
              wasReversed: isReversed,
            };
          });
        nextCards = shuffle(queue);
        if (isCancelled) return;
        setCards(nextCards);
        setSessionCardCount(nextCards.length);
        setIsLoading(false);
        return;
      }

      const session = await buildDailySession(today);
      const baseQueue = [...session.box1, ...session.due];
      const filteredByTag = tagFilter
        ? baseQueue.filter((entry) =>
            entry.card.tags.some(
              (tag) => tag === tagFilter || tag.startsWith(`${tagFilter}/`),
            ),
          )
        : baseQueue;
      const filteredQueue =
        selectedBox !== null
          ? filteredByTag.filter(
              (entry) => entry.reviewState.box === selectedBox,
            )
          : filteredByTag;
      const queue = filteredQueue.map((entry) => {
        const isReversed = Math.random() < reverseProbability;
        return {
          cardId: entry.card.id ?? 0,
          front: isReversed ? entry.card.back_md : entry.card.front_md,
          back: isReversed ? entry.card.front_md : entry.card.back_md,
          hint: entry.card.hint_md ?? null,
          tags: entry.card.tags ?? [],
          wasReversed: isReversed,
        };
      });
      const filtered = queue.filter((item) => item.cardId !== 0);
      nextCards = shuffle(filtered);
      if (isCancelled) return;
      setCards(nextCards);
      setSessionCardCount(nextCards.length);
      setIsLoading(false);
    };

    void loadSession();
    return () => {
      isCancelled = true;
    };
  }, [isTraining, selectedBox, tagFilter, today, onReset]);

  return { cards, setCards, sessionCardCount, isLoading };
}
