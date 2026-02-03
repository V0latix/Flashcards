import { useState } from 'react'
import { UserIcon } from '../components/icons'
import { useAuth } from './AuthProvider'
import { useI18n } from '../i18n/I18nProvider'

type AuthButtonProps = {
  className?: string
}

function AuthButton({ className }: AuthButtonProps) {
  const { user, loading, signInWithProvider, signOut } = useAuth()
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [status, setStatus] = useState<{ type: 'error' | 'success'; message: string } | null>(
    null
  )

  const openModal = () => {
    setStatus(null)
    setOpen(true)
  }

  const closeModal = () => {
    setOpen(false)
    setStatus(null)
  }

  const handleGoogle = async () => {
    setSubmitting(true)
    const { error } = await signInWithProvider('google')
    if (error) {
      setStatus({ type: 'error', message: error })
      setSubmitting(false)
    }
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
                <p className="auth-muted">{t('auth.googleHint')}</p>
                <button
                  type="button"
                  className="btn btn-secondary auth-provider"
                  onClick={handleGoogle}
                  disabled={submitting}
                >
                  {t('auth.googleCta')}
                </button>
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
