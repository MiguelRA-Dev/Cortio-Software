import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { CheckCircle2, XCircle } from 'lucide-react'
import AuthLayout from '../../layouts/AuthLayout'
import Button from '../../components/ui/Button'
import { useAuth } from '../../context/AuthContext'
import { verifyEmail, resendVerification } from '../../api/auth'

function VerifyEmailPage() {
  const { token } = useParams()
  const navigate = useNavigate()
  const { user, isAuthenticated, updateUser } = useAuth()
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')
  const [resent, setResent] = useState(false)

  useEffect(() => {
    let cancelled = false
    verifyEmail(token)
      .then((updatedUser) => {
        if (cancelled) return
        setStatus('success')
        if (isAuthenticated) updateUser(updatedUser)
      })
      .catch((err) => {
        if (cancelled) return
        setError(err.response?.data?.error || 'Este link no es válido o ya expiró.')
        setStatus('error')
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  async function handleResend() {
    await resendVerification()
    setResent(true)
  }

  return (
    <AuthLayout>
      {status === 'loading' && <p className="text-sm text-muted">Verificando tu correo…</p>}

      {status === 'success' && (
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-success/10 text-success">
            <CheckCircle2 size={24} />
          </div>
          <h1 className="mt-4 text-lg font-semibold text-ink">¡Correo verificado!</h1>
          <p className="mt-2 text-sm text-muted">Tu cuenta ya aparece como verificada dentro de Cortio.</p>
          <Button
            className="mt-6 w-full"
            onClick={() => navigate(isAuthenticated ? '/app' : '/login')}
          >
            {isAuthenticated ? 'Ir al panel' : 'Iniciar sesión'}
          </Button>
        </div>
      )}

      {status === 'error' && (
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-danger/10 text-danger">
            <XCircle size={24} />
          </div>
          <h1 className="mt-4 text-lg font-semibold text-ink">No pudimos verificarte</h1>
          <p className="mt-2 text-sm text-muted">{error}</p>

          {isAuthenticated && !user?.emailVerified && (
            <div className="mt-6">
              <Button onClick={handleResend} disabled={resent} className="w-full">
                {resent ? 'Correo reenviado' : 'Reenviar correo de verificación'}
              </Button>
            </div>
          )}

          {!isAuthenticated && (
            <Link to="/login" className="mt-6 inline-block text-sm font-medium text-accent hover:text-accent-hover">
              Ir a iniciar sesión
            </Link>
          )}
        </div>
      )}
    </AuthLayout>
  )
}

export default VerifyEmailPage
