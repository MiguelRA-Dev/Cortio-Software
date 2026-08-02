import { useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { MapPin, Phone, Clock, ArrowLeft, CheckCircle2, UserRound } from 'lucide-react'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import ThemeToggle from '../../components/ui/ThemeToggle'
import Stepper from '../../components/booking/Stepper'
import BarberCard from '../../components/booking/BarberCard'
import { formatCOP } from '../../lib/format'
import { useAuth } from '../../context/AuthContext'
import { getPublicBarbershop } from '../../api/barbershops'
import { listPublicBarbers } from '../../api/barbers'
import { listPublicServices } from '../../api/services'
import { getAvailability, createAppointment } from '../../api/appointments'

const STEPS = ['Barbero', 'Servicio', 'Horario', 'Confirmar']

function nextDays(count) {
  const days = []
  for (let i = 0; i < count; i++) {
    const d = new Date()
    d.setDate(d.getDate() + i)
    days.push(d)
  }
  return days
}

function dateKey(date) {
  return date.toISOString().slice(0, 10)
}

function formatTime(iso) {
  return new Date(iso).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: false })
}

function PublicBookingPage() {
  const { slug } = useParams()
  const { user, isAuthenticated, login, registerCustomer, logout } = useAuth()

  const [step, setStep] = useState(1)
  const [barber, setBarber] = useState(null)
  const [service, setService] = useState(null)
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [selectedTime, setSelectedTime] = useState(null)
  const [authMode, setAuthMode] = useState('register')
  const [contact, setContact] = useState({ name: '', email: '', phone: '', password: '' })
  const [confirmed, setConfirmed] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [bookingError, setBookingError] = useState('')

  const isCustomerSession = isAuthenticated && user?.role === 'customer'

  const { data: barbershop, isLoading: loadingBarbershop, isError: barbershopError } = useQuery({
    queryKey: ['public-barbershop', slug],
    queryFn: () => getPublicBarbershop(slug),
  })
  const { data: barbers = [] } = useQuery({
    queryKey: ['public-barbers', slug],
    queryFn: () => listPublicBarbers(slug),
  })
  const { data: services = [] } = useQuery({
    queryKey: ['public-services', slug],
    queryFn: () => listPublicServices(slug),
  })

  const days = useMemo(() => nextDays(7), [])
  const selectedKey = dateKey(selectedDate)

  const { data: slots = [] } = useQuery({
    queryKey: ['availability', slug, barber?._id, service?._id, selectedKey],
    queryFn: () => getAvailability(slug, { barberId: barber._id, serviceId: service._id, date: selectedKey }),
    enabled: Boolean(barber && service),
  })

  function goTo(n) {
    setStep(n)
  }

  function selectBarber(b) {
    setBarber(b)
    setStep(2)
  }

  function selectService(s) {
    setService(s)
    setStep(3)
  }

  function selectTime(t) {
    setSelectedTime(t)
    setStep(4)
  }

  async function handleConfirm(e) {
    e.preventDefault()
    setBookingError('')
    setSubmitting(true)
    try {
      if (!isCustomerSession) {
        if (authMode === 'register') {
          await registerCustomer({ name: contact.name, email: contact.email, password: contact.password, phone: contact.phone })
        } else {
          await login(contact.email, contact.password)
        }
      }
      await createAppointment({ slug, barberId: barber._id, serviceId: service._id, startTime: selectedTime })
      setConfirmed(true)
    } catch (err) {
      setBookingError(err.response?.data?.error || 'No pudimos completar la reserva. Intenta de nuevo.')
    } finally {
      setSubmitting(false)
    }
  }

  function switchAccount() {
    logout()
    setContact({ name: '', email: '', phone: '', password: '' })
  }

  if (loadingBarbershop) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg">
        <span className="text-sm text-muted">Cargando…</span>
      </div>
    )
  }

  if (barbershopError || !barbershop) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg px-4">
        <p className="text-sm text-muted">No encontramos esta barbería.</p>
      </div>
    )
  }

  if (confirmed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg px-4">
        <Card className="w-full max-w-sm text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-success/10 text-success">
            <CheckCircle2 size={24} />
          </div>
          <h1 className="mt-4 text-lg font-semibold text-ink">¡Cita confirmada!</h1>
          <p className="mt-2 text-sm text-muted">
            {service?.name} con {barber?.name} el{' '}
            {selectedDate.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })} a las{' '}
            {formatTime(selectedTime)}.
          </p>
          <p className="mt-4 text-xs text-muted">Guarda esta pantalla como comprobante de tu cita.</p>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-bg">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-2xl items-start justify-between px-4 py-6">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-ink">{barbershop.name}</h1>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
              {barbershop.address && (
                <span className="flex items-center gap-1">
                  <MapPin size={12} /> {barbershop.address}
                </span>
              )}
              {barbershop.phone && (
                <span className="flex items-center gap-1">
                  <Phone size={12} /> {barbershop.phone}
                </span>
              )}
            </div>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-8">
        <Stepper steps={STEPS} current={step} onStepClick={goTo} />

        <Card className="mt-6">
          {step === 1 && (
            <div>
              <h2 className="text-base font-semibold text-ink">Elige tu barbero</h2>
              {barbers.length === 0 ? (
                <p className="mt-4 text-sm text-muted">Esta barbería aún no tiene barberos disponibles.</p>
              ) : (
                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {barbers.map((b) => (
                    <BarberCard key={b._id} barber={b} selected={barber?._id === b._id} onSelect={() => selectBarber(b)} />
                  ))}
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div>
              <button type="button" onClick={() => goTo(1)} className="mb-4 flex items-center gap-1 text-sm text-muted hover:text-ink">
                <ArrowLeft size={14} /> Cambiar barbero
              </button>
              <h2 className="text-base font-semibold text-ink">Elige un servicio</h2>
              <div className="mt-4 flex flex-col divide-y divide-border">
                {services.map((s) => (
                  <button
                    key={s._id}
                    type="button"
                    onClick={() => selectService(s)}
                    className="flex items-center justify-between gap-4 py-3.5 text-left first:pt-0 last:pb-0 hover:opacity-70"
                  >
                    <div>
                      <p className="text-sm font-medium text-ink">{s.name}</p>
                      <p className="flex items-center gap-1 text-xs text-muted">
                        <Clock size={11} /> {s.durationMinutes} min
                      </p>
                    </div>
                    <span className="shrink-0 text-sm font-medium tabular-nums text-ink">{formatCOP(s.price)}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <button type="button" onClick={() => goTo(2)} className="mb-4 flex items-center gap-1 text-sm text-muted hover:text-ink">
                <ArrowLeft size={14} /> Cambiar servicio
              </button>
              <h2 className="text-base font-semibold text-ink">Elige fecha y hora</h2>

              <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
                {days.map((d) => {
                  const isSelected = d.toDateString() === selectedDate.toDateString()
                  const works = (barber.schedule || []).some((s) => s.dayOfWeek === d.getDay())
                  return (
                    <button
                      key={d.toISOString()}
                      type="button"
                      disabled={!works}
                      onClick={() => setSelectedDate(d)}
                      className={`flex shrink-0 flex-col items-center rounded-lg border px-3 py-2 text-xs transition-colors ${
                        isSelected
                          ? 'border-ink bg-ink text-bg'
                          : works
                            ? 'border-border text-ink hover:border-ink/50'
                            : 'border-border text-muted/40'
                      }`}
                    >
                      <span className="capitalize">{d.toLocaleDateString('es-CO', { weekday: 'short' })}</span>
                      <span className="font-medium">{d.getDate()}</span>
                    </button>
                  )
                })}
              </div>

              <div className="mt-5 grid grid-cols-3 gap-2 sm:grid-cols-4">
                {slots.length === 0 ? (
                  <p className="col-span-full text-sm text-muted">No hay horarios disponibles este día.</p>
                ) : (
                  slots.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => selectTime(t)}
                      className={`rounded-lg border px-2 py-2 text-sm transition-colors ${
                        selectedTime === t
                          ? 'border-ink bg-ink text-bg'
                          : 'border-border text-ink hover:border-ink/50'
                      }`}
                    >
                      {formatTime(t)}
                    </button>
                  ))
                )}
              </div>
            </div>
          )}

          {step === 4 && (
            <div>
              <button type="button" onClick={() => goTo(3)} className="mb-4 flex items-center gap-1 text-sm text-muted hover:text-ink">
                <ArrowLeft size={14} /> Cambiar horario
              </button>
              <h2 className="text-base font-semibold text-ink">Confirma tu cita</h2>

              <div className="mt-4 rounded-lg border border-border bg-surface-2 p-3.5 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted">Barbero</span>
                  <span className="font-medium text-ink">{barber?.name}</span>
                </div>
                <div className="mt-1.5 flex items-center justify-between">
                  <span className="text-muted">Servicio</span>
                  <span className="font-medium text-ink">{service?.name}</span>
                </div>
                <div className="mt-1.5 flex items-center justify-between">
                  <span className="text-muted">Fecha</span>
                  <span className="font-medium capitalize text-ink">
                    {selectedDate.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })}, {formatTime(selectedTime)}
                  </span>
                </div>
                <div className="mt-1.5 flex items-center justify-between border-t border-border pt-1.5">
                  <span className="text-muted">Total</span>
                  <span className="font-semibold tabular-nums text-ink">{formatCOP(service?.price || 0)}</span>
                </div>
              </div>

              {isCustomerSession ? (
                <form onSubmit={handleConfirm} className="mt-5 flex flex-col gap-4">
                  <div className="flex items-center gap-3 rounded-lg border border-border bg-surface-2 p-3.5">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface text-muted">
                      <UserRound size={16} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ink">{user.name}</p>
                      <p className="truncate text-xs text-muted">{user.email}</p>
                    </div>
                    <button type="button" onClick={switchAccount} className="shrink-0 text-xs text-muted underline hover:text-ink">
                      No soy yo
                    </button>
                  </div>
                  {bookingError && (
                    <p className="rounded-lg border border-danger/30 bg-danger/10 px-3.5 py-2.5 text-sm text-danger">{bookingError}</p>
                  )}
                  <Button type="submit" disabled={submitting} className="w-full">
                    {submitting ? 'Confirmando...' : 'Confirmar cita'}
                  </Button>
                </form>
              ) : (
                <div className="mt-5">
                  <div className="flex gap-1 rounded-lg border border-border bg-surface-2 p-1">
                    <button
                      type="button"
                      onClick={() => setAuthMode('register')}
                      className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                        authMode === 'register' ? 'bg-accent text-accent-ink' : 'text-muted hover:text-ink'
                      }`}
                    >
                      Crear cuenta
                    </button>
                    <button
                      type="button"
                      onClick={() => setAuthMode('login')}
                      className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                        authMode === 'login' ? 'bg-accent text-accent-ink' : 'text-muted hover:text-ink'
                      }`}
                    >
                      Ya tengo cuenta
                    </button>
                  </div>

                  <form onSubmit={handleConfirm} className="mt-4 flex flex-col gap-4">
                    {authMode === 'register' && (
                      <>
                        <Input
                          id="contactName"
                          label="Nombre completo"
                          placeholder="Tu nombre"
                          value={contact.name}
                          onChange={(e) => setContact({ ...contact, name: e.target.value })}
                          required
                        />
                        <Input
                          id="contactPhone"
                          label="Teléfono"
                          placeholder="300 123 4567"
                          value={contact.phone}
                          onChange={(e) => setContact({ ...contact, phone: e.target.value })}
                          required
                        />
                      </>
                    )}
                    <Input
                      id="contactEmail"
                      type="email"
                      label="Correo electrónico"
                      placeholder="tucorreo@ejemplo.com"
                      value={contact.email}
                      onChange={(e) => setContact({ ...contact, email: e.target.value })}
                      required
                    />
                    <Input
                      id="contactPassword"
                      type="password"
                      label={authMode === 'register' ? 'Crea una contraseña' : 'Contraseña'}
                      placeholder="••••••••"
                      value={contact.password}
                      onChange={(e) => setContact({ ...contact, password: e.target.value })}
                      required
                    />
                    {authMode === 'register' && (
                      <p className="-mt-2 text-xs text-muted">
                        Con esto creamos tu cuenta para que puedas ver y gestionar tus citas la próxima vez sin volver a
                        registrarte.
                      </p>
                    )}
                    {bookingError && (
                      <p className="rounded-lg border border-danger/30 bg-danger/10 px-3.5 py-2.5 text-sm text-danger">{bookingError}</p>
                    )}
                    <Button type="submit" disabled={submitting} className="w-full">
                      {submitting ? 'Procesando...' : authMode === 'register' ? 'Crear cuenta y confirmar' : 'Iniciar sesión y confirmar'}
                    </Button>
                  </form>
                </div>
              )}
            </div>
          )}
        </Card>
      </main>
    </div>
  )
}

export default PublicBookingPage
