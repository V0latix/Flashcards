import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { applyReviewResult, revertReviewResult } from "../leitner/engine";
import type { ReviewState } from "../db/types";
import { useI18n } from "../i18n/useI18n";
import { useAuth } from "../auth/useAuth";
import {
  getTodayKey,
  notifyDailyProgressUpdated,
  notifyDailyStatusUpdated,
  reconcileDailyStatus,
} from "../streak/dailyStatus";
import { useReviewFilters } from "./review/useReviewFilters";
import { useSessionLoader } from "./review/useSessionLoader";
import { useCardMutation } from "./review/useCardMutation";
import { useReviewKeyboard } from "./review/useReviewKeyboard";
import { useScrollReset } from "./review/useScrollReset";
import SessionComplete from "./review/SessionComplete";
import ReviewCard from "./review/ReviewCard";

function ReviewSession() {
  const { t } = useI18n();
  const { user } = useAuth();
  const today = useMemo(() => getTodayKey(), []);
  const completedSaveKey = useRef<string | null>(null);
  const [searchParams] = useSearchParams();

  const { tagFilter, selectedBox, isTraining } = useReviewFilters(searchParams);

  const [answers, setAnswers] = useState<Record<number, "good" | "bad">>({});
  const [index, setIndex] = useState(0);
  const [showBack, setShowBack] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [goodCount, setGoodCount] = useState(0);
  const [badCount, setBadCount] = useState(0);
  const [pendingReviewWrites, setPendingReviewWrites] = useState(0);
  const [lastAnswer, setLastAnswer] = useState<{
    cardId: number;
    previousState: ReviewState;
    clientEventId: string;
    result: "good" | "bad";
  } | null>(null);

  const resetSession = useCallback(() => {
    setAnswers({});
    setIndex(0);
    setShowBack(false);
    setShowHint(false);
    setGoodCount(0);
    setBadCount(0);
    setPendingReviewWrites(0);
    setLastAnswer(null);
  }, []);

  const { cards, setCards, sessionCardCount, isLoading } = useSessionLoader(
    isTraining,
    selectedBox,
    tagFilter,
    today,
    resetSession,
  );

  const currentCard = cards[index];
  const nextCard = cards[index + 1];

  const mutation = useCardMutation(
    currentCard,
    setCards,
    setIndex,
    setShowBack,
    setShowHint,
    setAnswers,
  );

  const handleReveal = useCallback(() => {
    setShowBack(true);
  }, []);

  const handleAnswer = useCallback(
    async (result: "good" | "bad") => {
      if (!currentCard) return;
      if (!isTraining) {
        setPendingReviewWrites((prev) => prev + 1);
        applyReviewResult(
          currentCard.cardId,
          result,
          today,
          currentCard.wasReversed,
        )
          .then((snapshot) => {
            setLastAnswer({
              cardId: currentCard.cardId,
              previousState: snapshot.previousState,
              clientEventId: snapshot.clientEventId,
              result,
            });
          })
          .catch((error) => {
            console.error("applyReviewResult failed", error);
          })
          .finally(() => {
            setPendingReviewWrites((prev) => Math.max(0, prev - 1));
            notifyDailyProgressUpdated();
          });
      }
      setAnswers((prev) => ({ ...prev, [currentCard.cardId]: result }));
      setShowBack(false);
      setShowHint(false);
      setIndex((prev) => prev + 1);
      if (result === "good") {
        setGoodCount((prev) => prev + 1);
      } else {
        setBadCount((prev) => prev + 1);
      }
    },
    [currentCard, isTraining, today],
  );

  const handleUndo = useCallback(async () => {
    if (!lastAnswer || index === 0) return;
    if (!isTraining) {
      await revertReviewResult(
        lastAnswer.cardId,
        lastAnswer.previousState,
        lastAnswer.clientEventId,
      ).catch((error) => {
        console.error("revertReviewResult failed", error);
      });
      notifyDailyProgressUpdated();
    }
    setIndex((prev) => prev - 1);
    setAnswers((prev) => {
      const next = { ...prev };
      delete next[lastAnswer.cardId];
      return next;
    });
    if (lastAnswer.result === "good") {
      setGoodCount((prev) => Math.max(0, prev - 1));
    } else {
      setBadCount((prev) => Math.max(0, prev - 1));
    }
    setShowBack(false);
    setShowHint(false);
    setLastAnswer(null);
  }, [index, isTraining, lastAnswer]);

  const isDone = !isLoading && index >= cards.length;
  const goodCards = cards.filter((card) => answers[card.cardId] === "good");
  const badCards = cards.filter((card) => answers[card.cardId] === "bad");
  const reviewedCount = Math.min(index, cards.length);
  const remainingCount = Math.max(cards.length - index, 0);
  const hasHint = Boolean(currentCard?.hint?.trim());
  const progressPercent =
    cards.length > 0 ? Math.round((reviewedCount / cards.length) * 100) : 0;
  const canUndo = index > 0 && lastAnswer !== null && !isTraining;

  // Save daily completion when session is done
  useEffect(() => {
    if (
      isTraining ||
      !isDone ||
      !user ||
      sessionCardCount === 0 ||
      pendingReviewWrites > 0
    )
      return;
    let cancelled = false;
    const saveDoneStatus = async () => {
      const saveKey = `${user.id}:${today}`;
      if (completedSaveKey.current === saveKey) return;
      try {
        const didReconcile = await reconcileDailyStatus(user.id, today);
        if (cancelled || !didReconcile) return;
        completedSaveKey.current = saveKey;
        notifyDailyStatusUpdated();
      } catch (error) {
        if (cancelled) return;
        console.error(
          "daily_cards_status reconcile failed",
          (error as Error).message,
        );
      }
    };
    void saveDoneStatus();
    return () => {
      cancelled = true;
    };
  }, [isDone, isTraining, pendingReviewWrites, sessionCardCount, today, user]);

  useReviewKeyboard(
    currentCard,
    showBack,
    hasHint,
    isLoading,
    isDone,
    mutation.isDeleteOpen,
    handleReveal,
    handleAnswer,
    () => setShowHint((prev) => !prev),
    canUndo ? handleUndo : undefined,
  );

  const { frontMarkdownRef, backMarkdownRef } = useScrollReset(
    currentCard,
    showBack,
  );

  return (
    <main className="container page review-page">
      {isLoading ? (
        <p>{t("status.loading")}</p>
      ) : isDone ? (
        <SessionComplete
          isTraining={isTraining}
          cards={cards}
          answers={answers}
          goodCards={goodCards}
          badCards={badCards}
          goodCount={goodCount}
          badCount={badCount}
        />
      ) : currentCard ? (
        <ReviewCard
          currentCard={currentCard}
          nextCard={nextCard}
          isTraining={isTraining}
          tagFilter={tagFilter}
          selectedBox={selectedBox}
          showBack={showBack}
          showHint={showHint}
          hasHint={hasHint}
          reviewedCount={reviewedCount}
          remainingCount={remainingCount}
          progressPercent={progressPercent}
          totalCards={cards.length}
          frontMarkdownRef={frontMarkdownRef}
          backMarkdownRef={backMarkdownRef}
          isDeleteOpen={mutation.isDeleteOpen}
          setIsDeleteOpen={mutation.setIsDeleteOpen}
          isDeleting={mutation.isDeleting}
          isSuspending={mutation.isSuspending}
          handleReveal={handleReveal}
          handleAnswer={handleAnswer}
          setShowHint={setShowHint}
          handleDelete={mutation.handleDelete}
          handleSuspend={mutation.handleSuspend}
          canUndo={canUndo}
          handleUndo={handleUndo}
        />
      ) : (
        <p>{t("review.empty")}</p>
      )}
    </main>
  );
}

export default ReviewSession;
