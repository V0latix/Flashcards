import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ChartIcon, HomeIcon, PlayIcon, PlusIcon, SettingsIcon } from './icons'

type AppShellProps = {
  children: React.ReactNode
}

const NavButton = ({
  to,
  label,
  icon,
  isActive
}: {
  to: string
  label: string
  icon: React.ReactNode
  isActive: boolean
}) => (
  <Link
    to={to}
    className={isActive ? 'nav-link nav-link-active' : 'nav-link'}
    aria-label={label}
  >
    <span className="nav-icon">{icon}</span>
    <span className="nav-text">{label}</span>
  </Link>
)

function AppShell({ children }: AppShellProps) {
  const location = useLocation()
  const [addOpen, setAddOpen] = useState(false)
  const isHome = location.pathname === '/'

  const isActive = (path: string) => location.pathname === path

  return (
    <div className={isHome ? 'app-shell app-shell-home' : 'app-shell'}>
      {!isHome ? (
        <header className="app-header">
          <div className="app-header-inner">
            <NavButton
              to="/"
              label="Home"
              icon={<HomeIcon className="icon" />}
              isActive={isActive('/')}
            />
            <NavButton
              to="/review"
              label="Session"
              icon={<PlayIcon className="icon" />}
              isActive={isActive('/review')}
            />
            <div className="nav-add">
              <button
                type="button"
                className="btn btn-primary"
                aria-label="Ajouter"
                onClick={() => setAddOpen((prev) => !prev)}
              >
                <span className="nav-icon">
                  <PlusIcon className="icon" />
                </span>
                <span className="nav-text">Ajouter</span>
              </button>
              {addOpen ? (
                <div className="nav-menu" role="menu">
                  <Link to="/card/new" role="menuitem" onClick={() => setAddOpen(false)}>
                    Ajouter une carte
                  </Link>
                  <Link to="/import-export" role="menuitem" onClick={() => setAddOpen(false)}>
                    Importer
                  </Link>
                  <Link to="/packs" role="menuitem" onClick={() => setAddOpen(false)}>
                    Packs
                  </Link>
                </div>
              ) : null}
            </div>
            <NavButton
              to="/stats"
              label="Stats"
              icon={<ChartIcon className="icon" />}
              isActive={isActive('/stats')}
            />
            <NavButton
              to="/settings"
              label="Settings"
              icon={<SettingsIcon className="icon" />}
              isActive={isActive('/settings')}
            />
          </div>
        </header>
      ) : null}

      <div className={isHome ? 'page page-home' : 'page'}>{children}</div>

      {!isHome ? (
        <nav className="bottom-nav" aria-label="Navigation principale">
          <NavButton
            to="/"
            label="Home"
            icon={<HomeIcon className="icon" />}
            isActive={isActive('/')}
          />
          <NavButton
            to="/review"
            label="Session"
            icon={<PlayIcon className="icon" />}
            isActive={isActive('/review')}
          />
          <NavButton
            to="/card/new"
            label="Ajouter"
            icon={<PlusIcon className="icon" />}
            isActive={isActive('/card/new')}
          />
          <NavButton
            to="/stats"
            label="Stats"
            icon={<ChartIcon className="icon" />}
            isActive={isActive('/stats')}
          />
          <NavButton
            to="/settings"
            label="Settings"
            icon={<SettingsIcon className="icon" />}
            isActive={isActive('/settings')}
          />
        </nav>
      ) : null}
    </div>
  )
}

export default AppShell
