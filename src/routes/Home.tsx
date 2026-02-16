import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import AuthButton from '../auth/AuthButton'
import { ChartIcon, HomeIcon, PlayIcon, PlusIcon, SettingsIcon } from '../components/icons'
import db from '../db'
import type { ReviewState } from '../db/types'
import { getLeitnerSettings } from '../leitner/settings'
import { useI18n } from '../i18n/useI18n'

type HomeBoxSummary = {
  dueCounts: Record<number, number>
  nextDue: Record<number, string | null>
  tomorrowDueCount: number
}

const parseIsoDate = (value: string) => {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day))
}

const toDateKey = (value: Date) => value.toISOString().slice(0, 10)

const normalizeToDateKey = (value: string | null | undefined) => {
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

const addDays = (value: string, days: number) => {
  const date = parseIsoDate(value)
  date.setUTCDate(date.getUTCDate() + days)
  return toDateKey(date)
}

const computeDueKey = (state: ReviewState, learnedIntervalDays: number) => {
  if (state.is_learned && state.learned_at) {
    const learnedKey = normalizeToDateKey(state.learned_at)
    if (!learnedKey) {
      return null
    }
    return addDays(learnedKey, learnedIntervalDays)
  }
  return normalizeToDateKey(state.due_date)
}

function Home() {
  const todayKey = useMemo(() => new Date().toISOString().slice(0, 10), [])
  const tomorrowKey = useMemo(() => {
    const today = new Date(`${todayKey}T00:00:00.000Z`)
    today.setUTCDate(today.getUTCDate() + 1)
    return today.toISOString().slice(0, 10)
  }, [todayKey])
  const { t, language } = useI18n()
  const [boxSummary, setBoxSummary] = useState<HomeBoxSummary>(() => ({
    dueCounts: { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    nextDue: { 0: null, 1: null, 2: null, 3: null, 4: null, 5: null },
    tomorrowDueCount: 0
  }))

  const formatDate = (value: string | null) => {
    if (!value) {
      return t('status.none')
    }
    const parsed = normalizeToDateKey(value)
    if (!parsed) {
      return value
    }
    const date = parseIsoDate(parsed)
    const locale = language === 'fr' ? 'fr-FR' : 'en-US'
    return date.toLocaleDateString(locale, {
      timeZone: 'UTC',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  useEffect(() => {
    const loadSummary = async () => {
      const states = await db.reviewStates.toArray()
      const { learnedReviewIntervalDays } = getLeitnerSettings()

      const dueCounts: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
      const nextDue: Record<number, string | null> = {
        0: null,
        1: null,
        2: null,
        3: null,
        4: null,
        5: null
      }
      let tomorrowDueCount = 0

      states.forEach((state) => {
        const dueKey = computeDueKey(state, learnedReviewIntervalDays)
        if (!dueKey) {
          return
        }
        const box = state.box
        if (dueKey <= todayKey) {
          dueCounts[box] = (dueCounts[box] ?? 0) + 1
          return
        }
        if (dueKey === tomorrowKey && box >= 1 && box <= 5) {
          tomorrowDueCount += 1
        }
        const currentNext = nextDue[box]
        if (!currentNext || dueKey < currentNext) {
          nextDue[box] = dueKey
        }
      })

      setBoxSummary({ dueCounts, nextDue, tomorrowDueCount })
    }

    void loadSummary()

    const handleFocus = () => {
      void loadSummary()
    }

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        void loadSummary()
      }
    }

    window.addEventListener('focus', handleFocus)
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      window.removeEventListener('focus', handleFocus)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [todayKey, tomorrowKey])

  return (
    <main className="home-hero">
      <div className="home-account">
        <AuthButton className="btn btn-secondary auth-button" />
      </div>
      <section className="home-summary card section" aria-label={t('labels.boxes')}>
        <div className="panel-header">
          <h2>{t('labels.today')}</h2>
          <span className="chip">
            {t('labels.date')}: {formatDate(todayKey)}
          </span>
        </div>
        <div className="home-summary-grid">
          {[1, 2, 3, 4, 5].map((box) => (
            <div key={box} className="home-summary-item">
              <div className="chip">
                {t('labels.box')} {box}
              </div>
              <p className="home-summary-count">
                {boxSummary.dueCounts[box] ?? 0} {t('labels.due')}
              </p>
              <p className="home-summary-next">
                {t('labels.nextReview')}: {formatDate(boxSummary.nextDue[box])}
              </p>
            </div>
          ))}
          <div className="home-summary-item home-summary-item-tomorrow">
            <div className="chip">{t('labels.tomorrow')}</div>
            <p className="home-summary-count">{boxSummary.tomorrowDueCount}</p>
          </div>
        </div>
      </section>
      <div className="home-grid" role="navigation" aria-label={t('nav.home')}>
        <Link
          to="/review"
          className="home-tile home-primary"
          aria-label={t('home.startSession')}
        >
          <PlayIcon className="home-icon" />
          <span className="home-label">{t('home.startSession')}</span>
          <span className="home-desc">{t('home.startSessionDesc')}</span>
        </Link>
        <div className="home-tile home-action" aria-label={t('nav.add')}>
          <PlusIcon className="home-icon" />
          <span className="home-label">{t('nav.add')}</span>
          <span className="home-desc">{t('home.addDesc')}</span>
          <div className="home-actions">
            <Link to="/card/new" className="home-action-link">
              {t('actions.addCard')}
            </Link>
            <Link to="/import-export" className="home-action-link">
              {t('home.importJson')}
            </Link>
            <Link to="/packs" className="home-action-link">
              {t('actions.packs')}
            </Link>
          </div>
        </div>
        <Link to="/library" className="home-tile" aria-label={t('home.library')}>
          <HomeIcon className="home-icon" />
          <span className="home-label">{t('home.library')}</span>
          <span className="home-desc">{t('home.libraryDesc')}</span>
        </Link>
        <Link to="/stats" className="home-tile" aria-label={t('nav.stats')}>
          <ChartIcon className="home-icon" />
          <span className="home-label">{t('nav.stats')}</span>
          <span className="home-desc">{t('home.statsDesc')}</span>
        </Link>
        <Link to="/settings" className="home-tile" aria-label={t('nav.settings')}>
          <SettingsIcon className="home-icon" />
          <span className="home-label">{t('nav.settings')}</span>
          <span className="home-desc">{t('home.settingsDesc')}</span>
        </Link>
      </div>
    </main>
  )
}

export default Home
