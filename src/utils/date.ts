export const parseDateKey = (value: string): Date => {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day))
}

export const toDateKey = (value: string | Date): string => {
  if (typeof value === 'string' && value.length >= 10) {
    return value.slice(0, 10)
  }
  return new Date(value).toISOString().slice(0, 10)
}

export const addDays = (value: string, days: number): string => {
  const date = parseDateKey(value)
  date.setUTCDate(date.getUTCDate() + days)
  return toDateKey(date)
}

export const normalizeToDateKey = (
  value: string | null | undefined
): string | null => {
  if (!value) {
    return null
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value
  }
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return null
  }
  return toDateKey(parsed)
}

export const normalizeTodayKey = (value: string): string => {
  if (value.length === 10) {
    return value
  }
  return toDateKey(new Date(value))
}
