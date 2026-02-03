import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { translations, type Language } from './translations'

type I18nContextValue = {
  language: Language
  setLanguage: (language: Language) => void
  t: (key: string, params?: Record<string, string | number>) => string
}

const I18nContext = createContext<I18nContextValue | undefined>(undefined)

const STORAGE_KEY = 'flashcards_language'

const resolvePath = (source: Record<string, unknown>, path: string): unknown => {
  return path.split('.').reduce<unknown>((acc, part) => {
    if (!acc || typeof acc !== 'object') {
      return undefined
    }
    return (acc as Record<string, unknown>)[part]
  }, source)
}

const formatText = (value: string, params?: Record<string, string | number>) => {
  if (!params) {
    return value
  }
  return value.replace(/\{\{(\w+)\}\}/g, (_, key: string) =>
    key in params ? String(params[key]) : ''
  )
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    if (typeof localStorage === 'undefined') {
      return 'fr'
    }
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored === 'en' ? 'en' : 'fr'
  })

  const setLanguage = useCallback((next: Language) => {
    setLanguageState(next)
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, next)
    }
  }, [])

  const t = useCallback(
    (key: string, params?: Record<string, string | number>) => {
      const locale = translations[language]
      const value = resolvePath(locale as Record<string, unknown>, key)
      if (typeof value === 'string') {
        return formatText(value, params)
      }
      return key
    },
    [language]
  )

  const value = useMemo<I18nContextValue>(
    () => ({ language, setLanguage, t }),
    [language, setLanguage, t]
  )

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n() {
  const context = useContext(I18nContext)
  if (!context) {
    throw new Error('useI18n must be used within I18nProvider')
  }
  return context
}
