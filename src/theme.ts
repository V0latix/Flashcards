export type ThemeMode = 'light' | 'dark'

const THEME_KEY = 'flashcards_theme'

export const getStoredTheme = (): ThemeMode => {
  const stored = localStorage.getItem(THEME_KEY)
  if (stored === 'dark' || stored === 'light') {
    return stored
  }
  return 'light'
}

export const applyTheme = (theme: ThemeMode) => {
  document.documentElement.dataset.theme = theme
}

export const setTheme = (theme: ThemeMode) => {
  localStorage.setItem(THEME_KEY, theme)
  applyTheme(theme)
}
