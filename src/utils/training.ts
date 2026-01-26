export const TRAINING_QUEUE_KEY = 'flashcards_training_queue'

export const saveTrainingQueue = (ids: number[]) => {
  if (typeof sessionStorage === 'undefined') {
    return
  }
  const payload = {
    ids,
    createdAt: new Date().toISOString()
  }
  sessionStorage.setItem(TRAINING_QUEUE_KEY, JSON.stringify(payload))
}

export const consumeTrainingQueue = (): number[] => {
  if (typeof sessionStorage === 'undefined') {
    return []
  }
  const raw = sessionStorage.getItem(TRAINING_QUEUE_KEY)
  if (!raw) {
    return []
  }
  sessionStorage.removeItem(TRAINING_QUEUE_KEY)
  try {
    const parsed = JSON.parse(raw) as { ids?: unknown }
    if (!Array.isArray(parsed.ids)) {
      return []
    }
    return parsed.ids
      .map((id) => Number(id))
      .filter((id) => Number.isFinite(id) && id > 0)
  } catch {
    return []
  }
}
