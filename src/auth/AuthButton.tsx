import { useState } from 'react'
import { UserIcon } from '../components/icons'
import { useAuth } from './AuthProvider'

type AuthButtonProps = {
  className?: string
}

function AuthButton({ className }: AuthButtonProps) {
  const { user, loading, signInWithMagicLink, signInWithProvider, signOut } = useAuth()
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [status, setStatus] = useState<{ type: 'error' | 'success'; message: string } | null>(
    null
  )

  const openModal = () => {
    setEmail(user?.email ?? '')
    setStatus(null)
    setOpen(true)
  }

  const closeModal = () => {
    setOpen(false)
    setStatus(null)
  }

  const handleSendLink = async () => {
    const trimmed = email.trim()
    if (!trimmed) {
      setStatus({ type: 'error', message: 'Email requis.' })
      return
    }
    setSubmitting(true)
    const { error } = await signInWithMagicLink(trimmed)
    if (error) {
      setStatus({ type: 'error', message: error })
    } else {
      setStatus({ type: 'success', message: 'Lien envoyé. Vérifie tes emails.' })
    }
    setSubmitting(false)
  }

  const handleGithub = async () => {
    setSubmitting(true)
    const { error } = await signInWithProvider('github')
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
                <p className="auth-muted">
                  Envoie un lien magique pour te connecter sur tous tes appareils.
                </p>
                <button
                  type="button"
                  className="btn btn-secondary auth-provider"
                  onClick={handleGithub}
                  disabled={submitting}
                >
                  Continuer avec GitHub
                </button>
                <div className="auth-divider">
                  <span>ou</span>
                </div>
                <label className="sr-only" htmlFor="auth-email">
                  Email
                </label>
                <input
                  id="auth-email"
                  className="input"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                />
                {status ? (
                  <p className={status.type === 'error' ? 'auth-error' : 'auth-success'}>
                    {status.message}
                  </p>
                ) : null}
                <div className="button-row">
                  <button type="button" className="btn btn-secondary" onClick={closeModal}>
                    Annuler
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleSendLink}
                    disabled={submitting}
                  >
                    Envoyer le lien
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
