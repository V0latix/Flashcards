import AsyncStorage from '@react-native-async-storage/async-storage'
import { getDefaultLeitnerSettings, type LeitnerSettings } from '../core/leitner'

const STORAGE_KEY = 'flashcards_mobile_settings_v1'

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

export const getLeitnerSettings = async (): Promise<LeitnerSettings> => {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return getDefaultLeitnerSettings()
    }
    const parsed = JSON.parse(raw) as Partial<LeitnerSettings>
    const defaults = getDefaultLeitnerSettings()

    const box1Target = toPositiveInt(parsed.box1Target) ?? defaults.box1Target
    const intervalDays: Record<number, number> = {}
    for (const box of [1, 2, 3, 4, 5]) {
      const value = parsed.intervalDays ? parsed.intervalDays[box] : undefined
      intervalDays[box] = toPositiveInt(value) ?? defaults.intervalDays[box]
    }
    const learnedReviewIntervalDays =
      toPositiveInt(parsed.learnedReviewIntervalDays) ??
      defaults.learnedReviewIntervalDays
    const reverseProbability =
      toClampedProbability(parsed.reverseProbability) ?? defaults.reverseProbability

    return {
      box1Target,
      intervalDays,
      learnedReviewIntervalDays,
      reverseProbability
    }
  } catch {
    return getDefaultLeitnerSettings()
  }
}

export const saveLeitnerSettings = async (settings: LeitnerSettings): Promise<void> => {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
}
