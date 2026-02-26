import { useEffect, useRef, useState } from 'react'
import { UserIcon } from '../components/icons'
import { useAuth } from './useAuth'
import { useI18n } from '../i18n/useI18n'

type AuthButtonProps = {
  className?: string
}

function AuthButton({ className }: AuthButtonProps) {
  const { user, loading, signInWithProvider, signInWithEmail, signOut } = useAuth()
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [status, setStatus] = useState<{ type: 'error' | 'success'; message: string } | null>(
    null
  )
  const triggerButtonRef = useRef<HTMLButtonElement | null>(null)
  const modalRef = useRef<HTMLDivElement | null>(null)
  const emailInputRef = useRef<HTMLInputElement | null>(null)
  const shouldRestoreFocusRef = useRef(false)

  const getFocusableElements = () => {
    const modal = modalRef.current
    if (!modal) {
      return []
    }
    const selector = [
      'button:not([disabled])',
      'a[href]',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])'
    ].join(',')
    return Array.from(modal.querySelectorAll<HTMLElement>(selector))
  }

  const openModal = () => {
    setStatus(null)
    setEmail('')
    setOpen(true)
  }

  const closeModal = (restoreFocus = false) => {
    if (restoreFocus) {
      shouldRestoreFocusRef.current = true
    }
    setOpen(false)
    setEmail('')
    setStatus(null)
  }

  useEffect(() => {
    if (!open) {
      if (shouldRestoreFocusRef.current) {
        triggerButtonRef.current?.focus()
        shouldRestoreFocusRef.current = false
      }
      return
    }

    if (user) {
      const focusables = getFocusableElements()
      focusables[0]?.focus()
    } else {
      emailInputRef.current?.focus()
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        closeModal(true)
        return
      }

      if (event.key !== 'Tab') {
        return
      }

      const focusables = getFocusableElements()
      if (focusables.length === 0) {
        event.preventDefault()
        return
      }

      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      const active = document.activeElement

      if (event.shiftKey) {
        if (active === first || !focusables.includes(active as HTMLElement)) {
          event.preventDefault()
          last.focus()
        }
        return
      }

      if (active === last || !focusables.includes(active as HTMLElement)) {
        event.preventDefault()
        first.focus()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [open, user])

  const handleBackdropMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) {
      return
    }
    closeModal(true)
  }

  const handleGithub = async () => {
    setSubmitting(true)
    const { error } = await signInWithProvider('github')
    if (error) {
      setStatus({ type: 'error', message: error })
      setOpen(true)
    }
    setSubmitting(false)
  }

  const handleEmailSignIn = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const normalizedEmail = email.trim()
    if (!normalizedEmail) {
      setStatus({ type: 'error', message: t('auth.emailInvalid') })
      return
    }

    setSubmitting(true)
    const { error } = await signInWithEmail(normalizedEmail)
    if (error) {
      setStatus({ type: 'error', message: error })
    } else {
      setStatus({ type: 'success', message: t('auth.emailSent', { email: normalizedEmail }) })
    }
    setSubmitting(false)
  }

  const handleSignOut = async () => {
    setSubmitting(true)
    const { error } = await signOut()
    if (error) {
      setStatus({ type: 'error', message: error })
    } else {
      setStatus({ type: 'success', message: t('auth.signedOut') })
    }
    setSubmitting(false)
  }

  const buttonLabel = loading ? `${t('auth.account')}...` : user ? t('auth.account') : t('auth.login')

  return (
    <>
      <button
        ref={triggerButtonRef}
        type="button"
        className={className ?? 'btn btn-secondary auth-button'}
        onClick={openModal}
        disabled={loading}
      >
        <UserIcon className="icon" />
        <span>{buttonLabel}</span>
      </button>
      {open ? (
        <div className="modal-backdrop" onMouseDown={handleBackdropMouseDown}>
          <div
            ref={modalRef}
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="auth-modal-title"
          >
            <h3 id="auth-modal-title">{user ? t('auth.account') : t('auth.login')}</h3>
            {user ? (
              <>
                <p className="auth-muted">
                  {t('auth.loggedInAs', { email: user.email ?? t('auth.account') })}
                </p>
                {status ? (
                  <p className={status.type === 'error' ? 'auth-error' : 'auth-success'}>
                    {status.message}
                  </p>
                ) : null}
                <div className="button-row">
                  <button type="button" className="btn btn-secondary" onClick={() => closeModal(true)}>
                    {t('actions.close')}
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={handleSignOut}
                    disabled={submitting}
                  >
                    {t('auth.signOut')}
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="auth-muted">{t('auth.githubHint')}</p>
                <button
                  type="button"
                  className="btn btn-secondary auth-provider"
                  onClick={handleGithub}
                  disabled={submitting}
                >
                  {t('auth.githubCta')}
                </button>
                <div className="auth-divider">{t('auth.or')}</div>
                <form className="auth-email-form" onSubmit={handleEmailSignIn}>
                  <label className="sr-only" htmlFor="auth-email-input">
                    {t('auth.emailLabel')}
                  </label>
                  <input
                    ref={emailInputRef}
                    id="auth-email-input"
                    className="input"
                    type="email"
                    autoComplete="email"
                    placeholder={t('auth.emailPlaceholder')}
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    disabled={submitting}
                    required
                  />
                  <p className="auth-muted">{t('auth.emailHint')}</p>
                  <button type="submit" className="btn btn-secondary auth-provider" disabled={submitting}>
                    {t('auth.emailCta')}
                  </button>
                </form>
                {status ? (
                  <p className={status.type === 'error' ? 'auth-error' : 'auth-success'}>
                    {status.message}
                  </p>
                ) : null}
                <div className="button-row">
                  <button type="button" className="btn btn-secondary" onClick={() => closeModal(true)}>
                    {t('actions.cancel')}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      ) : null}
    </>
  )
}

export default AuthButton
