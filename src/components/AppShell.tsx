import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import AuthButton from '../auth/AuthButton'
import { ChartIcon, HomeIcon, LibraryIcon, PlayIcon, PlusIcon, SettingsIcon } from './icons'
import { useI18n } from '../i18n/useI18n'
import LeitnerInfo from './LeitnerInfo'
import StreakBadge from './StreakBadge'

type AppShellProps = {
  children: React.ReactNode
}

const NavButton = ({
  to,
  label,
  icon,
  isActive,
  onClick
}: {
  to: string
  label: string
  icon: React.ReactNode
  isActive: boolean
  onClick?: () => void
}) => (
  <Link
    to={to}
    className={isActive ? 'nav-link nav-link-active' : 'nav-link'}
    aria-label={label}
    onClick={onClick}
  >
    <span className="nav-icon">{icon}</span>
    <span className="nav-text">{label}</span>
  </Link>
)

function AppShell({ children }: AppShellProps) {
  const location = useLocation()
  const [addOpen, setAddOpen] = useState(false)
  const addMenuId = 'app-shell-add-menu'
  const addRootRef = useRef<HTMLDivElement | null>(null)
  const addButtonRef = useRef<HTMLButtonElement | null>(null)
  const firstAddItemRef = useRef<HTMLAnchorElement | null>(null)
  const restoreAddFocusRef = useRef(false)
  const isHome = location.pathname === '/'
  const { t } = useI18n()

  const isActive = (path: string) =>
    location.pathname === path || location.pathname.startsWith(`${path}/`)
  const isAddRoute =
    isActive('/card') || isActive('/import-export') || isActive('/packs')
  const isAddActive = isAddRoute || addOpen

  const closeAddMenu = useCallback((restoreFocus = false) => {
    if (restoreFocus) {
      restoreAddFocusRef.current = true
    }
    setAddOpen(false)
  }, [])

  useEffect(() => {
    if (!addOpen) {
      if (restoreAddFocusRef.current) {
        addButtonRef.current?.focus()
        restoreAddFocusRef.current = false
      }
      return
    }

    firstAddItemRef.current?.focus()

    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target
      if (target instanceof Node && addRootRef.current?.contains(target)) {
        return
      }
      closeAddMenu(true)
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') {
        return
      }
      event.preventDefault()
      closeAddMenu(true)
    }

    window.addEventListener('keydown', onKeyDown)
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('touchstart', onPointerDown)

    return () => {
      window.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('touchstart', onPointerDown)
    }
  }, [addOpen, closeAddMenu])

  return (
    <div className={isHome ? 'app-shell app-shell-home' : 'app-shell'}>
      {!isHome ? (
        <header className="app-header">
          <div className="app-header-inner">
            <NavButton
              to="/"
              label={t('nav.home')}
              icon={<HomeIcon className="icon" />}
              isActive={location.pathname === '/'}
              onClick={() => closeAddMenu()}
            />
            <NavButton
              to="/review"
              label={t('nav.session')}
              icon={<PlayIcon className="icon" />}
              isActive={isActive('/review')}
              onClick={() => closeAddMenu()}
            />
            <NavButton
              to="/library"
              label={t('nav.library')}
              icon={<LibraryIcon className="icon" />}
              isActive={isActive('/library')}
              onClick={() => closeAddMenu()}
            />
            <div className="nav-add" ref={addRootRef}>
              <button
                ref={addButtonRef}
                type="button"
                className={
                  isAddActive
                    ? 'btn btn-primary nav-add-button nav-add-button-active'
                    : 'btn btn-primary nav-add-button'
                }
                aria-label={t('nav.add')}
                aria-haspopup="menu"
                aria-expanded={addOpen}
                aria-controls={addMenuId}
                onClick={() => setAddOpen((prev) => !prev)}
              >
                <span className="nav-icon">
                  <PlusIcon className="icon" />
                </span>
                <span className="nav-text">{t('nav.add')}</span>
              </button>
              {addOpen ? (
                <div id={addMenuId} className="nav-menu" role="menu">
                  <Link
                    ref={firstAddItemRef}
                    to="/card/new"
                    role="menuitem"
                    onClick={() => closeAddMenu()}
                  >
                    {t('actions.addCard')}
                  </Link>
                  <Link
                    to="/import-export"
                    role="menuitem"
                    onClick={() => closeAddMenu()}
                  >
                    {t('actions.import')}
                  </Link>
                  <Link to="/packs" role="menuitem" onClick={() => closeAddMenu()}>
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
              onClick={() => closeAddMenu()}
            />
            <NavButton
              to="/settings"
              label={t('nav.settings')}
              icon={<SettingsIcon className="icon" />}
              isActive={isActive('/settings')}
              onClick={() => closeAddMenu()}
            />
            <div className="account-cluster">
              <StreakBadge />
              <div className="auth-trigger">
                <AuthButton />
              </div>
              <LeitnerInfo />
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
            isActive={location.pathname === '/'}
            onClick={() => closeAddMenu()}
          />
          <NavButton
            to="/review"
            label={t('nav.session')}
            icon={<PlayIcon className="icon" />}
            isActive={isActive('/review')}
            onClick={() => closeAddMenu()}
          />
          <NavButton
            to="/library"
            label={t('nav.library')}
            icon={<LibraryIcon className="icon" />}
            isActive={isActive('/library')}
            onClick={() => closeAddMenu()}
          />
          <NavButton
            to="/card/new"
            label={t('nav.add')}
            icon={<PlusIcon className="icon" />}
            isActive={isAddRoute}
            onClick={() => closeAddMenu()}
          />
          <NavButton
            to="/stats"
            label={t('nav.stats')}
            icon={<ChartIcon className="icon" />}
            isActive={isActive('/stats')}
            onClick={() => closeAddMenu()}
          />
          <NavButton
            to="/settings"
            label={t('nav.settings')}
            icon={<SettingsIcon className="icon" />}
            isActive={isActive('/settings')}
            onClick={() => closeAddMenu()}
          />
        </nav>
      ) : null}
    </div>
  )
}

export default AppShell
