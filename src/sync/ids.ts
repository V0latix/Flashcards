const DEVICE_KEY = 'flashcards_device_id'

export const createUuid = (): string => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  const template = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'
  return template.replace(/[xy]/g, (char) => {
    const rand = Math.random() * 16
    const value = char === 'x' ? rand : (rand % 4) + 8
    return Math.floor(value).toString(16)
  })
}

export const getDeviceId = (): string => {
  if (typeof localStorage === 'undefined') {
    return 'web'
  }
  const existing = localStorage.getItem(DEVICE_KEY)
  if (existing) {
    return existing
  }
  const created = createUuid()
  localStorage.setItem(DEVICE_KEY, created)
  return created
}
