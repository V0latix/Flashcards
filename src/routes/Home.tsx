import { Link } from 'react-router-dom'
import AuthButton from '../auth/AuthButton'
import { ChartIcon, HomeIcon, PlayIcon, PlusIcon, SettingsIcon } from '../components/icons'

function Home() {
  return (
    <main className="home-hero">
      <div className="home-account">
        <AuthButton className="btn btn-secondary auth-button" />
      </div>
      <div className="home-grid" role="navigation" aria-label="Accueil">
        <Link to="/review" className="home-tile home-primary" aria-label="Commencer une session">
          <PlayIcon className="home-icon" />
          <span className="home-label">Commencer une session</span>
          <span className="home-desc">Lance la session du jour.</span>
        </Link>
        <div className="home-tile home-action" aria-label="Ajouter">
          <PlusIcon className="home-icon" />
          <span className="home-label">Ajouter</span>
          <span className="home-desc">Carte, import JSON ou packs.</span>
          <div className="home-actions">
            <Link to="/card/new" className="home-action-link">
              Ajouter une carte
            </Link>
            <Link to="/import-export" className="home-action-link">
              Importer JSON
            </Link>
            <Link to="/packs" className="home-action-link">
              Packs
            </Link>
          </div>
        </div>
        <Link to="/library" className="home-tile" aria-label="Library">
          <HomeIcon className="home-icon" />
          <span className="home-label">Library</span>
          <span className="home-desc">Tes cartes locales et tags.</span>
        </Link>
        <Link to="/stats" className="home-tile" aria-label="Stats">
          <ChartIcon className="home-icon" />
          <span className="home-label">Stats</span>
          <span className="home-desc">Progression et performances.</span>
        </Link>
        <Link to="/settings" className="home-tile" aria-label="Settings">
          <SettingsIcon className="home-icon" />
          <span className="home-label">Settings</span>
          <span className="home-desc">Parametres Leitner.</span>
        </Link>
      </div>
    </main>
  )
}

export default Home
