import { BOX1_TARGET, INTERVAL_DAYS } from './config'

export type LeitnerSettings = {
  box1Target: number
  intervalDays: Record<number, number>
}

const STORAGE_KEY = 'leitnerSettings'

const getDefaultSettings = (): LeitnerSettings => ({
  box1Target: BOX1_TARGET,
  intervalDays: { ...INTERVAL_DAYS }
})

const toPositiveInt = (value: unknown): number | null => {
  const parsed = typeof value === 'string' ? Number.parseInt(value, 10) : Number(value)
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null
  }
  return Math.floor(parsed)
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
    return { box1Target, intervalDays }
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
