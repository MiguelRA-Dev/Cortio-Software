import { useMemo, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import AuthLayout from '../../layouts/AuthLayout'
import Input from '../../components/ui/Input'
import Button from '../../components/ui/Button'
import Switch from '../../components/ui/Switch'
import Stepper from '../../components/booking/Stepper'
import GoogleSignInButton from '../../components/auth/GoogleSignInButton'
import { useAuth } from '../../context/AuthContext'

// Client-side only — for prefilling the wizard (email, name). The backend independently
// re-verifies the raw credential with Google before ever trusting it.
function decodeGoogleCredential(credential) {
  const base64Url = credential.split('.')[1]
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=')
  return JSON.parse(atob(padded))
}

const STEPS = ['Cuenta', 'Datos personales', 'Tu negocio', 'Servicios']

const SERVICE_CATEGORIES = ['Cortes', 'Peinados', 'Color', 'Cejas', 'Limpieza Facial', 'Masajes', 'Otro']

function shuffle(items) {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

// NFD normalization splits accented letters into a base letter + a combining mark
// (codepoints 0x0300–0x036F) — e.g. "á" becomes "a" + a combining acute accent. Drop
// those marks to get a plain-ASCII base letter for the slug.
function stripDiacritics(text) {
  let result = ''
  for (const ch of text) {
    const code = ch.codePointAt(0)
    if (code < 0x0300 || code > 0x036f) result += ch
  }
  return result
}

function slugify(text) {
  return stripDiacritics(text.toLowerCase().normalize('NFD'))
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
}

const EMPTY_FORM = {
  email: '',
  password: '',
  confirmPassword: '',
  googleCredential: null,
  ownerName: '',
  phone: '',
  barbershopName: '',
  slug: '',
  location: '',
  address: '',
  addressDetails: '',
  serviceCategories: [...SERVICE_CATEGORIES],
}

function RegisterPage() {
  const { registerBarbershop, isAuthenticated, loading: sessionLoading } = useAuth()
  const navigate = useNavigate()
  const shuffledCategories = useMemo(() => shuffle(SERVICE_CATEGORIES), [])

  const [step, setStep] = useState(1)
  const [form, setForm] = useState(EMPTY_FORM)
  const [slugEdited, setSlugEdited] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (!sessionLoading && isAuthenticated) {
    return <Navigate to="/app" replace />
  }

  function handleChange(e) {
    const { name, value } = e.target
    setForm((f) => {
      const next = { ...f, [name]: value }
      if (name === 'barbershopName' && !slugEdited) {
        next.slug = slugify(value)
      }
      return next
    })
  }

  function handleSlugChange(e) {
    setSlugEdited(true)
    setForm({ ...form, slug: e.target.value })
  }

  function toggleCategory(category) {
    setForm((f) => ({
      ...f,
      serviceCategories: f.serviceCategories.includes(category)
        ? f.serviceCategories.filter((c) => c !== category)
        : [...f.serviceCategories, category],
    }))
  }

  function validateStep(n) {
    if (n === 1) {
      if (form.googleCredential) {
        if (!form.email) return 'No pudimos leer tu correo de Google. Intenta de nuevo.'
        return ''
      }
      if (!form.email || !form.password || !form.confirmPassword) return 'Completa todos los campos.'
      if (form.password !== form.confirmPassword) return 'Las contraseñas no coinciden.'
      if (form.password.length < 6) return 'La contraseña debe tener al menos 6 caracteres.'
    }
    if (n === 2) {
      if (!form.ownerName || !form.phone) return 'Completa todos los campos.'
    }
    if (n === 3) {
      if (!form.barbershopName || !form.slug || !form.location || !form.address) return 'Completa todos los campos.'
    }
    return ''
  }

  function goNext(e) {
    e.preventDefault()
    const validationError = validateStep(step)
    if (validationError) {
      setError(validationError)
      return
    }
    setError('')
    setStep((s) => Math.min(s + 1, STEPS.length))
  }

  function goBack() {
    setError('')
    setStep((s) => Math.max(s - 1, 1))
  }

  function handleGoogleCredential(credential) {
    setError('')
    try {
      const payload = decodeGoogleCredential(credential)
      setForm((f) => ({
        ...f,
        email: payload.email || f.email,
        ownerName: payload.name || f.ownerName,
        googleCredential: credential,
      }))
      setStep(2)
    } catch {
      setError('No pudimos leer tu cuenta de Google. Intenta de nuevo.')
    }
  }

  function disconnectGoogle() {
    setForm((f) => ({ ...f, googleCredential: null, password: '', confirmPassword: '' }))
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

  const isLastStep = step === STEPS.length

  return (
    <AuthLayout>
      <h1 className="text-2xl font-semibold text-ink">Registra tu barbería</h1>
      <p className="mt-1.5 text-sm text-muted">
        ¿Eres cliente? Agenda desde el link de tu barbería, no necesitas registrarte aquí.
      </p>

      <div className="mt-6">
        <Stepper steps={STEPS} current={step} onStepClick={setStep} />
      </div>

      <form onSubmit={isLastStep ? handleSubmit : goNext} className="mt-6 flex flex-col gap-4">
        {step === 1 && (
          <>
            {form.googleCredential ? (
              <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface-2 px-3.5 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink">{form.email}</p>
                  <p className="text-xs text-muted">Cuenta de Google conectada</p>
                </div>
                <button
                  type="button"
                  onClick={disconnectGoogle}
                  className="shrink-0 text-xs font-medium text-muted underline hover:text-ink"
                >
                  Cambiar
                </button>
              </div>
            ) : (
              <>
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
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  label="Confirmar contraseña"
                  placeholder="••••••••"
                  value={form.confirmPassword}
                  onChange={handleChange}
                  required
                />

                {Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID) && (
                  <>
                    <div className="flex items-center gap-3">
                      <div className="h-px flex-1 bg-border" />
                      <span className="text-xs text-muted">o</span>
                      <div className="h-px flex-1 bg-border" />
                    </div>
                    <GoogleSignInButton onCredential={handleGoogleCredential} />
                  </>
                )}
              </>
            )}
          </>
        )}

        {step === 2 && (
          <>
            <Input
              id="ownerName"
              name="ownerName"
              label="Nombre completo"
              placeholder="Carlos Pérez"
              value={form.ownerName}
              onChange={handleChange}
              required
            />
            <Input
              id="phone"
              name="phone"
              label="Número de celular"
              placeholder="300 123 4567"
              value={form.phone}
              onChange={handleChange}
              required
            />
          </>
        )}

        {step === 3 && (
          <>
            <Input
              id="barbershopName"
              name="barbershopName"
              label="Nombre del negocio"
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
              onChange={handleSlugChange}
              required
            />
            <Input
              id="location"
              name="location"
              label="Ubicación (ciudad)"
              placeholder="Medellín, Antioquia"
              value={form.location}
              onChange={handleChange}
              required
            />
            <Input
              id="address"
              name="address"
              label="Dirección"
              placeholder="Cra 45 # 12-30"
              value={form.address}
              onChange={handleChange}
              required
            />
            <Input
              id="addressDetails"
              name="addressDetails"
              label="Detalles adicionales (opcional)"
              placeholder="Local 2, frente al parque"
              value={form.addressDetails}
              onChange={handleChange}
            />
          </>
        )}

        {step === 4 && (
          <div>
            <p className="text-sm text-muted">
              Selecciona los tipos de servicio que ofreces — te dejamos plantillas listas para editar en tu catálogo.
            </p>
            <div className="mt-3 flex flex-col gap-2">
              {shuffledCategories.map((category) => (
                <div
                  key={category}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border px-3.5 py-2.5"
                >
                  <span className="text-sm text-ink">{category}</span>
                  <Switch checked={form.serviceCategories.includes(category)} onChange={() => toggleCategory(category)} />
                </div>
              ))}
            </div>
          </div>
        )}

        {error && (
          <p className="rounded-lg border border-danger/30 bg-danger/10 px-3.5 py-2.5 text-sm text-danger">{error}</p>
        )}

        <div className="mt-2 flex items-center gap-3">
          {step > 1 && (
            <Button type="button" variant="secondary" onClick={goBack} className="flex-1">
              Atrás
            </Button>
          )}
          <Button type="submit" disabled={loading} className="flex-1">
            {isLastStep ? (loading ? 'Creando cuenta...' : 'Registrar mi barbería') : 'Continuar'}
          </Button>
        </div>
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
