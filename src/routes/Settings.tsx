import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ConfirmDialog from '../components/ConfirmDialog'
import { deleteAllCards } from '../db/queries'
import { getLeitnerSettings, saveLeitnerSettings } from '../leitner/settings'
import { markLocalChange } from '../sync/queue'
import { getStoredTheme, setTheme, type ThemeMode } from '../theme'
import { useI18n } from '../i18n/I18nProvider'

function Settings() {
  const { t, language, setLanguage } = useI18n()
  const defaultBox1Target = 10
  const defaultIntervals = {
    1: 1,
    2: 3,
    3: 7,
    4: 15,
    5: 30
  }
  const defaultLearnedInterval = 90
  const minLearnedInterval = 7
  const maxLearnedInterval = 3650

  const initialSettings = useMemo(() => getLeitnerSettings(), [])
  const [box1Target, setBox1Target] = useState(initialSettings.box1Target)
  const [intervals, setIntervals] = useState<Record<number, number>>({
    ...initialSettings.intervalDays
  })
  const [learnedReviewIntervalDays, setLearnedReviewIntervalDays] = useState(
    initialSettings.learnedReviewIntervalDays
  )
  const [reverseProbability, setReverseProbability] = useState(
    initialSettings.reverseProbability
  )
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => getStoredTheme())
  const [status, setStatus] = useState<string | null>(null)
  const [dangerOpen, setDangerOpen] = useState(false)
  const [dangerText, setDangerText] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)
  const navigate = useNavigate()

  const handleSave = (event: React.FormEvent) => {
    event.preventDefault()
    const values = [
      box1Target,
      intervals[1],
      intervals[2],
      intervals[3],
      intervals[4],
      intervals[5]
    ]
    if (values.some((value) => !Number.isFinite(value) || value <= 0)) {
      setStatus(t('settings.positiveNumbers'))
      return
    }
    if (
      learnedReviewIntervalDays < minLearnedInterval ||
      learnedReviewIntervalDays > maxLearnedInterval
    ) {
      setStatus(
        t('settings.learnedIntervalBounds', {
          min: minLearnedInterval,
          max: maxLearnedInterval
        })
      )
      return
    }
    saveLeitnerSettings({
      box1Target,
      intervalDays: { ...intervals },
      learnedReviewIntervalDays,
      reverseProbability
    })
    markLocalChange()
    setStatus(t('settings.saved'))
  }

  return (
    <main className="container page">
      <div className="page-header">
        <h1>{t('settings.title')}</h1>
        <p>{t('settings.subtitle')}</p>
      </div>
      <section className="card section">
        <h2>{t('labels.appearance')}</h2>
        <div className="section">
          <label className="theme-toggle" htmlFor="theme-toggle">
            <span>{t('labels.darkMode')}</span>
            <span className="theme-switch">
              <input
                id="theme-toggle"
                type="checkbox"
                className="theme-input"
                checked={themeMode === 'dark'}
                onChange={(event) => {
                  const nextTheme: ThemeMode = event.target.checked ? 'dark' : 'light'
                  setThemeMode(nextTheme)
                  setTheme(nextTheme)
                }}
              />
              <span className="theme-track" aria-hidden="true">
                <span className="theme-thumb" />
                <span className="theme-icon theme-icon-sun" aria-hidden="true">
                  ☀︎
                </span>
                <span className="theme-icon theme-icon-moon" aria-hidden="true">
                  ☾
                </span>
              </span>
            </span>
          </label>
        </div>
        <div className="section">
          <label htmlFor="language-select">{t('labels.language')}</label>
          <select
            id="language-select"
            className="input"
            value={language}
            onChange={(event) => setLanguage(event.target.value === 'en' ? 'en' : 'fr')}
          >
            <option value="fr">Français</option>
            <option value="en">English</option>
          </select>
        </div>
      </section>
      <form className="card section" onSubmit={handleSave}>
        <h2>{t('settings.review')}</h2>
        <div className="section">
          <label htmlFor="box1Target">{t('settings.box1Target')}</label>
          <input
            id="box1Target"
            type="number"
            min={1}
            value={box1Target}
            className="input"
            onChange={(event) => setBox1Target(Number(event.target.value))}
          />
        </div>
        <div className="section">
          <h2>{t('labels.intervals')}</h2>
          {[1, 2, 3, 4, 5].map((box) => (
            <div key={box} className="section">
              <label htmlFor={`interval-${box}`}>
                {t('labels.box')} {box}
              </label>
              <input
                id={`interval-${box}`}
                type="number"
                min={1}
                value={intervals[box]}
                className="input"
                onChange={(event) =>
                  setIntervals((prev) => ({
                    ...prev,
                    [box]: Number(event.target.value)
                  }))
                }
              />
            </div>
          ))}
        </div>
        <div className="section">
          <label htmlFor="learnedReviewIntervalDays">{t('labels.learnedReview')}</label>
          <input
            id="learnedReviewIntervalDays"
            type="number"
            min={minLearnedInterval}
            max={maxLearnedInterval}
            value={learnedReviewIntervalDays}
            className="input"
            onChange={(event) => setLearnedReviewIntervalDays(Number(event.target.value))}
          />
          <p>{t('settings.learnedIntervalHelp')}</p>
        </div>
        <div className="section">
          <label htmlFor="reverseProbability">{t('labels.reverseQA')}</label>
          <input
            id="reverseProbability"
            type="range"
            min={0}
            max={100}
            value={Math.round(reverseProbability * 100)}
            className="input"
            onChange={(event) => setReverseProbability(Number(event.target.value) / 100)}
          />
          <p>{Math.round(reverseProbability * 100)}%</p>
        </div>
        <button type="submit" className="btn btn-primary">
          {t('actions.save')}
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => {
            setBox1Target(defaultBox1Target)
            setIntervals({ ...defaultIntervals })
            setLearnedReviewIntervalDays(defaultLearnedInterval)
            setReverseProbability(0)
            setStatus(t('settings.defaultRestored'))
            markLocalChange()
          }}
        >
          {t('actions.restoreDefaults')}
        </button>
        {status ? <p>{status}</p> : null}
      </form>
      <section className="card section">
        <h2>{t('settings.dangerZone')}</h2>
        <p>{t('settings.dangerDesc')}</p>
        <button type="button" className="btn btn-danger" onClick={() => setDangerOpen(true)}>
          {t('settings.deleteAll')}
        </button>
      </section>
      <ConfirmDialog
        open={dangerOpen}
        title={t('settings.deleteAllTitle')}
        message={t('settings.deleteAllMessage')}
        confirmLabel={t('actions.delete')}
        onConfirm={async () => {
          if (isDeleting || dangerText !== 'SUPPRIMER') {
            return
          }
          setIsDeleting(true)
          await deleteAllCards()
          setStatus(t('settings.deletedDone'))
          setIsDeleting(false)
          setDangerOpen(false)
          setDangerText('')
          setTimeout(() => navigate('/'), 300)
        }}
        onCancel={() => {
          setDangerOpen(false)
          setDangerText('')
        }}
        isDanger
        confirmDisabled={isDeleting || dangerText !== 'SUPPRIMER'}
      >
        <div className="section">
          <label htmlFor="dangerInput">{t('settings.confirmDelete')}</label>
          <input
            id="dangerInput"
            type="text"
            className="input"
            value={dangerText}
            onChange={(event) => setDangerText(event.target.value)}
          />
        </div>
      </ConfirmDialog>
    </main>
  )
}

export default Settings
