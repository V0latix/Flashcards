import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import AuthButton from '../auth/AuthButton'
import { ChartIcon, HomeIcon, LibraryIcon, PlayIcon, PlusIcon, SettingsIcon } from './icons'
import { useI18n } from '../i18n/I18nProvider'

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
  const { t } = useI18n()

  const isActive = (path: string) => location.pathname === path

  return (
    <div className={isHome ? 'app-shell app-shell-home' : 'app-shell'}>
      {!isHome ? (
        <header className="app-header">
          <div className="app-header-inner">
            <NavButton
              to="/"
              label={t('nav.home')}
              icon={<HomeIcon className="icon" />}
              isActive={isActive('/')}
            />
            <NavButton
              to="/review"
              label={t('nav.session')}
              icon={<PlayIcon className="icon" />}
              isActive={isActive('/review')}
            />
            <NavButton
              to="/library"
              label={t('nav.library')}
              icon={<LibraryIcon className="icon" />}
              isActive={isActive('/library')}
            />
            <div className="nav-add">
              <button
                type="button"
                className="btn btn-primary"
                aria-label={t('nav.add')}
                onClick={() => setAddOpen((prev) => !prev)}
              >
                <span className="nav-icon">
                  <PlusIcon className="icon" />
                </span>
                <span className="nav-text">{t('nav.add')}</span>
              </button>
              {addOpen ? (
                <div className="nav-menu" role="menu">
                  <Link to="/card/new" role="menuitem" onClick={() => setAddOpen(false)}>
                    {t('actions.addCard')}
                  </Link>
                  <Link to="/import-export" role="menuitem" onClick={() => setAddOpen(false)}>
                    {t('actions.import')}
                  </Link>
                  <Link to="/packs" role="menuitem" onClick={() => setAddOpen(false)}>
                    {t('actions.packs')}
                  </Link>
                </div>
              ) : null}
            </div>
            <NavButton
              to="/stats"
              label={t('nav.stats')}
              icon={<ChartIcon className="icon" />}
              isActive={isActive('/stats')}
            />
            <NavButton
              to="/settings"
              label={t('nav.settings')}
              icon={<SettingsIcon className="icon" />}
              isActive={isActive('/settings')}
            />
            <div className="auth-trigger">
              <AuthButton />
            </div>
          </div>
        </header>
      ) : null}

      <div className={isHome ? 'page page-home' : 'page'}>{children}</div>

      {!isHome ? (
        <nav className="bottom-nav" aria-label={t('nav.home')}>
          <NavButton
            to="/"
            label={t('nav.home')}
            icon={<HomeIcon className="icon" />}
            isActive={isActive('/')}
          />
          <NavButton
            to="/review"
            label={t('nav.session')}
            icon={<PlayIcon className="icon" />}
            isActive={isActive('/review')}
          />
          <NavButton
            to="/library"
            label={t('nav.library')}
            icon={<LibraryIcon className="icon" />}
            isActive={isActive('/library')}
          />
          <NavButton
            to="/card/new"
            label={t('nav.add')}
            icon={<PlusIcon className="icon" />}
            isActive={isActive('/card/new')}
          />
          <NavButton
            to="/stats"
            label={t('nav.stats')}
            icon={<ChartIcon className="icon" />}
            isActive={isActive('/stats')}
          />
          <NavButton
            to="/settings"
            label={t('nav.settings')}
            icon={<SettingsIcon className="icon" />}
            isActive={isActive('/settings')}
          />
        </nav>
      ) : null}
    </div>
  )
}

export default AppShell
