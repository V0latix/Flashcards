import { BOX1_TARGET, INTERVAL_DAYS } from './config'

export type LeitnerSettings = {
  box1Target: number
  intervalDays: Record<number, number>
  learnedReviewIntervalDays: number
  reverseProbability: number
}

const STORAGE_KEY = 'leitnerSettings'

const getDefaultSettings = (): LeitnerSettings => ({
  box1Target: BOX1_TARGET,
  intervalDays: { ...INTERVAL_DAYS },
  learnedReviewIntervalDays: 90,
  reverseProbability: 0
})

const toPositiveInt = (value: unknown): number | null => {
  const parsed = typeof value === 'string' ? Number.parseInt(value, 10) : Number(value)
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null
  }
  return Math.floor(parsed)
}

const toClampedProbability = (value: unknown): number | null => {
  const parsed = typeof value === 'string' ? Number.parseFloat(value) : Number(value)
  if (!Number.isFinite(parsed)) {
    return null
  }
  if (parsed < 0) {
    return 0
  }
  if (parsed > 1) {
    return 1
  }
  return parsed
}

export const getLeitnerSettings = (): LeitnerSettings => {
  if (typeof localStorage === 'undefined') {
    return getDefaultSettings()
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return getDefaultSettings()
    }
    const parsed = JSON.parse(raw) as Partial<LeitnerSettings>
    const box1Target = toPositiveInt(parsed.box1Target) ?? BOX1_TARGET
    const intervalDays: Record<number, number> = {}
    for (const box of [1, 2, 3, 4, 5]) {
      const value = parsed.intervalDays ? parsed.intervalDays[box] : undefined
      intervalDays[box] = toPositiveInt(value) ?? INTERVAL_DAYS[box]
    }
    const learnedReviewIntervalDays =
      toPositiveInt(parsed.learnedReviewIntervalDays) ?? 90
    const reverseProbability = toClampedProbability(parsed.reverseProbability) ?? 0
    return {
      box1Target,
      intervalDays,
      learnedReviewIntervalDays,
      reverseProbability
    }
  } catch {
    return getDefaultSettings()
  }
}

export const saveLeitnerSettings = (settings: LeitnerSettings): void => {
  if (typeof localStorage === 'undefined') {
    return
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
}
