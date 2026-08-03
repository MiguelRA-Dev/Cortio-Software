import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import AuthLayout from '../../layouts/AuthLayout'
import Input from '../../components/ui/Input'
import Button from '../../components/ui/Button'
import { useAuth } from '../../context/AuthContext'

function LoginPage() {
  const { login, isAuthenticated, loading: sessionLoading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const notice = location.state?.notice
  const [form, setForm] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (!sessionLoading && isAuthenticated) {
    return <Navigate to="/app" replace />
  }

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(form.email, form.password)
      navigate('/app')
    } catch (err) {
      setError(err.response?.data?.error || 'No pudimos iniciar sesión. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout>
      <h1 className="text-2xl font-semibold text-ink">Inicia sesión</h1>
      <p className="mt-1.5 text-sm text-muted">Bienvenido de vuelta a Cortio</p>

      {notice && (
        <p className="mt-6 rounded-lg border border-border bg-surface-2 px-3.5 py-2.5 text-sm text-muted">{notice}</p>
      )}

      <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
        <Input
          id="email"
          name="email"
          type="email"
          label="Correo electrónico"
          placeholder="tucorreo@ejemplo.com"
          value={form.email}
          onChange={handleChange}
          autoComplete="email"
          required
        />
        <Input
          id="password"
          name="password"
          type="password"
          label="Contraseña"
          placeholder="••••••••"
          value={form.password}
          onChange={handleChange}
          autoComplete="current-password"
          required
        />

        {error && (
          <p className="rounded-lg border border-danger/30 bg-danger/10 px-3.5 py-2.5 text-sm text-danger">
            {error}
          </p>
        )}

        <Button type="submit" disabled={loading} className="mt-2 w-full">
          {loading ? 'Ingresando...' : 'Iniciar sesión'}
        </Button>
      </form>

      <p className="mt-8 text-center text-sm text-muted">
        ¿No tienes cuenta?{' '}
        <Link to="/register" className="font-medium text-accent hover:text-accent-hover">
          Regístrate
        </Link>
      </p>
    </AuthLayout>
  )
}

export default LoginPage
