const memory = new Map<string, string>()

const AsyncStorage = {
  getItem: async (key: string): Promise<string | null> => memory.get(key) ?? null,
  setItem: async (key: string, value: string): Promise<void> => {
    memory.set(key, value)
  },
  removeItem: async (key: string): Promise<void> => {
    memory.delete(key)
  },
  clear: async (): Promise<void> => {
    memory.clear()
  }
}

export default AsyncStorage
