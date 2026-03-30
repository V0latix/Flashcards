import { consumeTrainingQueue, TRAINING_QUEUE_KEY } from "../../utils/training";

export const TRAINING_QUEUE_REPLAY_WINDOW_MS = 15_000;
export const TRAINING_QUEUE_REPLAY_KEY = `${TRAINING_QUEUE_KEY}_replay`;

type TrainingReplayPayload = { ids?: unknown; consumedAt?: unknown };

export function normalizeTrainingIds(ids: unknown): number[] {
  if (!Array.isArray(ids)) return [];
  return ids
    .map((id) => Number(id))
    .filter((id) => Number.isFinite(id) && id > 0);
}

export function loadTrainingQueue(): number[] {
  if (typeof sessionStorage === "undefined") return [];

  const hasPendingQueue = Boolean(sessionStorage.getItem(TRAINING_QUEUE_KEY));

  if (hasPendingQueue) {
    const ids = consumeTrainingQueue();
    sessionStorage.setItem(
      TRAINING_QUEUE_REPLAY_KEY,
      JSON.stringify({ ids, consumedAt: Date.now() }),
    );
    return ids;
  }

  const replayRaw = sessionStorage.getItem(TRAINING_QUEUE_REPLAY_KEY);
  if (!replayRaw) return [];

  try {
    const parsed = JSON.parse(replayRaw) as TrainingReplayPayload;
    const replayIds = normalizeTrainingIds(parsed.ids);
    const consumedAt = Number(parsed.consumedAt);
    if (
      replayIds.length > 0 &&
      Number.isFinite(consumedAt) &&
      Date.now() - consumedAt <= TRAINING_QUEUE_REPLAY_WINDOW_MS
    ) {
      return replayIds;
    }
  } catch {
    // Ignore malformed replay payload.
  }
  sessionStorage.removeItem(TRAINING_QUEUE_REPLAY_KEY);
  return [];
}
