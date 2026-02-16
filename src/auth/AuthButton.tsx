import { useState } from 'react'
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

  const openModal = () => {
    setStatus(null)
    setEmail('')
    setOpen(true)
  }

  const closeModal = () => {
    setOpen(false)
    setEmail('')
    setStatus(null)
  }

  const handleGithub = async () => {
    setSubmitting(true)
    const { error } = await signInWithProvider('github')
    if (error) {
      setStatus({ type: 'error', message: error })
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
        type="button"
        className={className ?? 'btn btn-secondary auth-button'}
        onClick={openModal}
        disabled={loading}
      >
        <UserIcon className="icon" />
        <span>{buttonLabel}</span>
      </button>
      {open ? (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal">
            <h3>{user ? t('auth.account') : t('auth.login')}</h3>
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
                  <button type="button" className="btn btn-secondary" onClick={closeModal}>
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
                  <button type="button" className="btn btn-secondary" onClick={closeModal}>
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
