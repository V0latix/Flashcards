import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ConfirmDialog from '../components/ConfirmDialog'
import { deleteAllCards } from '../db/queries'
import { getLeitnerSettings, saveLeitnerSettings } from '../leitner/settings'
import { getStoredTheme, setTheme, type ThemeMode } from '../theme'

function Settings() {
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
      setStatus('Les valeurs doivent etre des nombres positifs.')
      return
    }
    if (
      learnedReviewIntervalDays < minLearnedInterval ||
      learnedReviewIntervalDays > maxLearnedInterval
    ) {
      setStatus(
        `L'intervalle learned doit etre entre ${minLearnedInterval} et ${maxLearnedInterval} jours.`
      )
      return
    }
    saveLeitnerSettings({
      box1Target,
      intervalDays: { ...intervals },
      learnedReviewIntervalDays,
      reverseProbability
    })
    setStatus('Parametres enregistres.')
  }

  return (
    <main className="container page">
      <div className="page-header">
        <h1>Settings</h1>
        <p>Configurer la taille de la Box 1 et les intervalles Leitner.</p>
      </div>
      <section className="card section">
        <h2>Apparence</h2>
        <div className="section">
          <label htmlFor="theme-toggle">Mode sombre</label>
          <div className="toggle-row">
            <input
              id="theme-toggle"
              type="checkbox"
              checked={themeMode === 'dark'}
              onChange={(event) => {
                const nextTheme: ThemeMode = event.target.checked ? 'dark' : 'light'
                setThemeMode(nextTheme)
                setTheme(nextTheme)
              }}
            />
            <span>{themeMode === 'dark' ? 'Activé' : 'Désactivé'}</span>
          </div>
        </div>
      </section>
      <form className="card section" onSubmit={handleSave}>
        <h2>Revision</h2>
        <div className="section">
          <label htmlFor="box1Target">Box 1 target</label>
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
          <h2>Intervalles (jours)</h2>
          {[1, 2, 3, 4, 5].map((box) => (
            <div key={box} className="section">
              <label htmlFor={`interval-${box}`}>Box {box}</label>
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
          <label htmlFor="learnedReviewIntervalDays">Revue maintien (jours)</label>
          <input
            id="learnedReviewIntervalDays"
            type="number"
            min={minLearnedInterval}
            max={maxLearnedInterval}
            value={learnedReviewIntervalDays}
            className="input"
            onChange={(event) => setLearnedReviewIntervalDays(Number(event.target.value))}
          />
          <p>Revision de maintien pour les cartes learned.</p>
        </div>
        <div className="section">
          <label htmlFor="reverseProbability">Inverser question/reponse</label>
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
          Enregistrer
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => {
            setBox1Target(defaultBox1Target)
            setIntervals({ ...defaultIntervals })
            setLearnedReviewIntervalDays(defaultLearnedInterval)
            setReverseProbability(0)
            setStatus('Valeurs par defaut restaurees.')
          }}
        >
          Restaurer valeurs par defaut
        </button>
        {status ? <p>{status}</p> : null}
      </form>
      <section className="card section">
        <h2>Danger zone</h2>
        <p>Suppression totale des cartes et de toutes les donnees locales.</p>
        <button type="button" className="btn btn-danger" onClick={() => setDangerOpen(true)}>
          Supprimer toutes les cartes
        </button>
      </section>
      <ConfirmDialog
        open={dangerOpen}
        title="Suppression totale"
        message="Toutes les cartes, sessions, statistiques et progressions seront supprimees."
        confirmLabel="Supprimer"
        onConfirm={async () => {
          if (isDeleting || dangerText !== 'SUPPRIMER') {
            return
          }
          setIsDeleting(true)
          await deleteAllCards()
          setStatus('Suppression terminee.')
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
          <label htmlFor="dangerInput">Tapez "SUPPRIMER" pour confirmer</label>
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
