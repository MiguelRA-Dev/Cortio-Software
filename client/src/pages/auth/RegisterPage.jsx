import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import AuthLayout from '../../layouts/AuthLayout'
import Input from '../../components/ui/Input'
import Button from '../../components/ui/Button'
import { useAuth } from '../../context/AuthContext'

const EMPTY_FORM = { barbershopName: '', slug: '', ownerName: '', email: '', password: '' }

function RegisterPage() {
  const { registerBarbershop, isAuthenticated, loading: sessionLoading } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState(EMPTY_FORM)

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
      await registerBarbershop(form)
      navigate('/app')
    } catch (err) {
      setError(err.response?.data?.error || 'No pudimos crear la cuenta. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout>
      <h1 className="text-2xl font-semibold text-ink">Registra tu barbería</h1>
      <p className="mt-1.5 text-sm text-muted">
        ¿Eres cliente? Agenda desde el link de tu barbería, no necesitas registrarte aquí.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
        <Input
          id="barbershopName"
          name="barbershopName"
          label="Nombre de la barbería"
          placeholder="Barbería El Corte"
          value={form.barbershopName}
          onChange={handleChange}
          required
        />
        <Input
          id="slug"
          name="slug"
          label="Link personalizado"
          placeholder="mi-barberia"
          value={form.slug}
          onChange={handleChange}
          required
        />
        <Input
          id="ownerName"
          name="ownerName"
          label="Tu nombre"
          placeholder="Carlos Pérez"
          value={form.ownerName}
          onChange={handleChange}
          required
        />
        <Input
          id="email"
          name="email"
          type="email"
          label="Correo electrónico"
          placeholder="tucorreo@ejemplo.com"
          value={form.email}
          onChange={handleChange}
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
          required
        />

        {error && (
          <p className="rounded-lg border border-danger/30 bg-danger/10 px-3.5 py-2.5 text-sm text-danger">{error}</p>
        )}

        <Button type="submit" disabled={loading} className="mt-2 w-full">
          {loading ? 'Creando cuenta...' : 'Registrar mi barbería'}
        </Button>
      </form>

      <p className="mt-8 text-center text-sm text-muted">
        ¿Ya tienes cuenta?{' '}
        <Link to="/login" className="font-medium text-accent hover:text-accent-hover">
          Inicia sesión
        </Link>
      </p>
    </AuthLayout>
  )
}

export default RegisterPage
