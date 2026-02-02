import { useState } from 'react'
import { UserIcon } from '../components/icons'
import { useAuth } from './AuthProvider'

type AuthButtonProps = {
  className?: string
}

function AuthButton({ className }: AuthButtonProps) {
  const { user, loading, signInWithProvider, signOut } = useAuth()
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
      setStatus({ type: 'success', message: 'Déconnecté.' })
    }
    setSubmitting(false)
  }

  const buttonLabel = loading ? 'Compte...' : user ? 'Compte' : 'Connexion'

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
            <h3>{user ? 'Compte' : 'Connexion'}</h3>
            {user ? (
              <>
                <p className="auth-muted">Connecté en tant que {user.email ?? 'Utilisateur'}.</p>
                {status ? (
                  <p className={status.type === 'error' ? 'auth-error' : 'auth-success'}>
                    {status.message}
                  </p>
                ) : null}
                <div className="button-row">
                  <button type="button" className="btn btn-secondary" onClick={closeModal}>
                    Fermer
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={handleSignOut}
                    disabled={submitting}
                  >
                    Se déconnecter
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="auth-muted">Connecte-toi avec Google pour synchroniser tes données.</p>
                <button
                  type="button"
                  className="btn btn-secondary auth-provider"
                  onClick={handleGoogle}
                  disabled={submitting}
                >
                  Continuer avec Google
                </button>
                {status ? (
                  <p className={status.type === 'error' ? 'auth-error' : 'auth-success'}>
                    {status.message}
                  </p>
                ) : null}
                <div className="button-row">
                  <button type="button" className="btn btn-secondary" onClick={closeModal}>
                    Annuler
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
