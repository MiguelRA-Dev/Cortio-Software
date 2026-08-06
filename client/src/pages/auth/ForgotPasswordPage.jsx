import { useState } from 'react'
import { Link } from 'react-router-dom'
import { MailCheck } from 'lucide-react'
import AuthLayout from '../../layouts/AuthLayout'
import Input from '../../components/ui/Input'
import Button from '../../components/ui/Button'
import { forgotPassword } from '../../api/auth'

function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    try {
      await forgotPassword(email)
    } finally {
      // Always show the same success state, whether or not the email exists —
      // never confirm/deny which emails are registered in Cortio.
      setLoading(false)
      setSent(true)
    }
  }

  if (sent) {
    return (
      <AuthLayout>
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-success/10 text-success">
            <MailCheck size={24} />
          </div>
          <h1 className="mt-4 text-lg font-semibold text-ink">Revisa tu correo</h1>
          <p className="mt-2 text-sm text-muted">
            Si <span className="font-medium text-ink">{email}</span> tiene una cuenta en Cortio, te enviamos un link
            para restablecer tu contraseña. Expira en 1 hora.
          </p>
          <Link to="/login" className="mt-6 inline-block text-sm font-medium text-accent hover:text-accent-hover">
            Volver a iniciar sesión
          </Link>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout>
      <h1 className="text-2xl font-semibold text-ink">Recupera tu contraseña</h1>
      <p className="mt-1.5 text-sm text-muted">Te enviaremos un link para crear una nueva.</p>

      <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
        <Input
          id="email"
          type="email"
          label="Correo electrónico"
          placeholder="tucorreo@ejemplo.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          required
        />

        <Button type="submit" disabled={loading} className="mt-2 w-full">
          {loading ? 'Enviando...' : 'Enviar link de recuperación'}
        </Button>
      </form>

      <p className="mt-8 text-center text-sm text-muted">
        ¿Ya la recordaste?{' '}
        <Link to="/login" className="font-medium text-accent hover:text-accent-hover">
          Inicia sesión
        </Link>
      </p>
    </AuthLayout>
  )
}

export default ForgotPasswordPage
