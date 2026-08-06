import { useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { XCircle } from 'lucide-react'
import AuthLayout from '../../layouts/AuthLayout'
import Input from '../../components/ui/Input'
import Button from '../../components/ui/Button'
import { useAuth } from '../../context/AuthContext'

function ResetPasswordPage() {
  const { token } = useParams()
  const navigate = useNavigate()
  const { completePasswordReset, isAuthenticated, loading: sessionLoading } = useAuth()
  const [form, setForm] = useState({ password: '', confirmPassword: '' })
  const [loading, setLoading] = useState(false)
  const [formError, setFormError] = useState('')
  const [linkInvalid, setLinkInvalid] = useState(false)

  if (!sessionLoading && isAuthenticated) {
    return <Navigate to="/app" replace />
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setFormError('')
    if (form.password !== form.confirmPassword) {
      setFormError('Las contraseñas no coinciden.')
      return
    }
    if (form.password.length < 6) {
      setFormError('La contraseña debe tener al menos 6 caracteres.')
      return
    }
    setLoading(true)
    try {
      await completePasswordReset({ token, password: form.password, confirmPassword: form.confirmPassword })
      navigate('/app')
    } catch (err) {
      setLinkInvalid(true)
    } finally {
      setLoading(false)
    }
  }

  if (linkInvalid) {
    return (
      <AuthLayout>
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-danger/10 text-danger">
            <XCircle size={24} />
          </div>
          <h1 className="mt-4 text-lg font-semibold text-ink">Este link ya no es válido</h1>
          <p className="mt-2 text-sm text-muted">Puede que ya lo hayas usado o que haya expirado (dura 1 hora).</p>
          <Link to="/forgot-password" className="mt-6 inline-block text-sm font-medium text-accent hover:text-accent-hover">
            Solicitar un nuevo link
          </Link>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout>
      <h1 className="text-2xl font-semibold text-ink">Crea una nueva contraseña</h1>
      <p className="mt-1.5 text-sm text-muted">Tu nueva contraseña debe tener al menos 6 caracteres.</p>

      <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
        <Input
          id="password"
          type="password"
          label="Nueva contraseña"
          placeholder="••••••••"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          autoComplete="new-password"
          required
        />
        <Input
          id="confirmPassword"
          type="password"
          label="Confirmar contraseña"
          placeholder="••••••••"
          value={form.confirmPassword}
          onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
          autoComplete="new-password"
          required
        />

        {formError && (
          <p className="rounded-lg border border-danger/30 bg-danger/10 px-3.5 py-2.5 text-sm text-danger">{formError}</p>
        )}

        <Button type="submit" disabled={loading} className="mt-2 w-full">
          {loading ? 'Guardando...' : 'Restablecer contraseña'}
        </Button>
      </form>
    </AuthLayout>
  )
}

export default ResetPasswordPage
