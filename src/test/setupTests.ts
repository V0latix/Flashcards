import '@testing-library/jest-dom/vitest'

const localStore: Record<string, string> = {}

Object.defineProperty(globalThis, 'localStorage', {
  value: {
    getItem: (key: string) => (key in localStore ? localStore[key] : null),
    setItem: (key: string, value: string) => {
      localStore[key] = String(value)
    },
    removeItem: (key: string) => {
      delete localStore[key]
    },
    clear: () => {
      Object.keys(localStore).forEach((key) => delete localStore[key])
    }
  }
})
