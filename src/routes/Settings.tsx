import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getLeitnerSettings, saveLeitnerSettings } from '../leitner/settings'

function Settings() {
  const [box1Target, setBox1Target] = useState(10)
  const [intervals, setIntervals] = useState<Record<number, number>>({
    1: 1,
    2: 3,
    3: 7,
    4: 15,
    5: 30
  })
  const [status, setStatus] = useState<string | null>(null)

  useEffect(() => {
    const data = getLeitnerSettings()
    setBox1Target(data.box1Target)
    setIntervals({ ...data.intervalDays })
  }, [])

  const handleSave = (event: React.FormEvent) => {
    event.preventDefault()
    const values = [box1Target, intervals[1], intervals[2], intervals[3], intervals[4], intervals[5]]
    if (values.some((value) => !Number.isFinite(value) || value <= 0)) {
      setStatus('Les valeurs doivent etre des nombres positifs.')
      return
    }
    saveLeitnerSettings({
      box1Target,
      intervalDays: { ...intervals }
    })
    setStatus('Parametres enregistres.')
  }

  return (
    <main className="container">
      <div className="page-header">
        <h1>Settings</h1>
        <p>Configurer la taille de la Box 1 et les intervalles Leitner.</p>
      </div>
      <form className="card section" onSubmit={handleSave}>
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
        <button type="submit" className="btn btn-primary">
          Enregistrer
        </button>
        {status ? <p>{status}</p> : null}
      </form>
      <nav>
        <ul>
          <li>
            <Link to="/">Home</Link>
          </li>
          <li>
            <Link to="/review">Review session</Link>
          </li>
          <li>
            <Link to="/library">Library</Link>
          </li>
          <li>
            <Link to="/card/new">New card</Link>
          </li>
          <li>
            <Link to="/stats">Stats</Link>
          </li>
          <li>
            <Link to="/import-export">Import/Export</Link>
          </li>
        </ul>
      </nav>
    </main>
  )
}

export default Settings
