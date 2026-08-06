import { useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { MapPin, Phone, Clock, ArrowLeft, CheckCircle2, UserRound, Star, CalendarClock } from 'lucide-react'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Modal from '../../components/ui/Modal'
import ThemeToggle from '../../components/ui/ThemeToggle'
import Stepper from '../../components/booking/Stepper'
import BarberCard from '../../components/booking/BarberCard'
import { formatCOP } from '../../lib/format'
import { resolveAssetUrl } from '../../lib/assets'
import { useAuth } from '../../context/AuthContext'
import { getPublicBarbershop } from '../../api/barbershops'
import { listPublicBarbers } from '../../api/barbers'
import { listPublicServices } from '../../api/services'
import { listPublicPortfolio } from '../../api/portfolio'
import { getAvailability, createAppointment, listMyAppointments, cancelMyAppointment } from '../../api/appointments'
import { listMyReviews, createReview } from '../../api/reviews'
import { toDateKey } from '../../lib/dates'

const STEPS = ['Barbero', 'Servicio', 'Horario', 'Confirmar']
const STATUS_LABEL = { pending: 'Pendiente', confirmed: 'Confirmada', completed: 'Completada', cancelled: 'Cancelada', no_show: 'No asistió' }

function StarPicker({ value, onChange }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" onClick={() => onChange(n)} aria-label={`${n} estrellas`}>
          <Star size={20} className={n <= value ? 'fill-ink text-ink' : 'text-muted'} />
        </button>
      ))}
    </div>
  )
}

function ReviewForm({ appointmentId, onDone }) {
  const queryClient = useQueryClient()
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')
  const [error, setError] = useState('')

  const mutation = useMutation({
    mutationFn: createReview,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-reviews'] })
      onDone?.()
    },
    onError: (err) => setError(err.response?.data?.error || 'No pudimos guardar tu calificación.'),
  })

  return (
    <div className="mt-3 flex flex-col gap-2.5 rounded-lg border border-border bg-surface-2 p-3">
      <StarPicker value={rating} onChange={setRating} />
      <textarea
        rows={2}
        placeholder="Cuéntanos cómo te fue (opcional)"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        className="w-full resize-none rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-accent"
      />
      {error && <p className="text-xs text-danger">{error}</p>}
      <Button
        type="button"
        onClick={() => mutation.mutate({ appointmentId, rating, comment })}
        disabled={mutation.isPending}
        className="self-start"
      >
        {mutation.isPending ? 'Enviando...' : 'Enviar calificación'}
      </Button>
    </div>
  )
}

function CustomerAuthForm({ idPrefix, mode, setMode, contact, setContact, onSubmit, submitting, error, submitLabel }) {
  return (
    <div>
      <div className="flex gap-1 rounded-lg border border-border bg-surface-2 p-1">
        <button
          type="button"
          onClick={() => setMode('register')}
          className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            mode === 'register' ? 'bg-accent text-accent-ink' : 'text-muted hover:text-ink'
          }`}
        >
          Crear cuenta
        </button>
        <button
          type="button"
          onClick={() => setMode('login')}
          className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            mode === 'login' ? 'bg-accent text-accent-ink' : 'text-muted hover:text-ink'
          }`}
        >
          Ya tengo cuenta
        </button>
      </div>

      <form onSubmit={onSubmit} className="mt-4 flex flex-col gap-4">
        {mode === 'register' && (
          <>
            <Input
              id={`${idPrefix}Name`}
              label="Nombre completo"
              placeholder="Tu nombre"
              value={contact.name}
              onChange={(e) => setContact({ ...contact, name: e.target.value })}
              required
            />
            <Input
              id={`${idPrefix}Phone`}
              label="Teléfono"
              placeholder="300 123 4567"
              value={contact.phone}
              onChange={(e) => setContact({ ...contact, phone: e.target.value })}
              required
            />
          </>
        )}
        <Input
          id={`${idPrefix}Email`}
          type="email"
          label="Correo electrónico"
          placeholder="tucorreo@ejemplo.com"
          value={contact.email}
          onChange={(e) => setContact({ ...contact, email: e.target.value })}
          required
        />
        <Input
          id={`${idPrefix}Password`}
          type="password"
          label={mode === 'register' ? 'Crea una contraseña' : 'Contraseña'}
          placeholder="••••••••"
          value={contact.password}
          onChange={(e) => setContact({ ...contact, password: e.target.value })}
          required
        />
        {mode === 'register' && (
          <p className="-mt-2 text-xs text-muted">
            Con esto creamos tu cuenta para que puedas ver y gestionar tus citas la próxima vez sin volver a
            registrarte.
          </p>
        )}
        {error && (
          <p className="rounded-lg border border-danger/30 bg-danger/10 px-3.5 py-2.5 text-sm text-danger">{error}</p>
        )}
        <Button type="submit" disabled={submitting} className="w-full">
          {submitting ? 'Procesando...' : submitLabel}
        </Button>
      </form>
    </div>
  )
}

function PoweredByCortio() {
  return (
    <footer className="mt-8 w-full border-t border-border py-8 text-center">
      <p className="text-2xl font-semibold tracking-tight text-ink">Cortio</p>
      <p className="mt-1 text-xs text-muted">© {new Date().getFullYear()} Cortio Software</p>
    </footer>
  )
}

function nextDays(count) {
  const days = []
  for (let i = 0; i < count; i++) {
    const d = new Date()
    d.setDate(d.getDate() + i)
    days.push(d)
  }
  return days
}

function formatTime(iso) {
  return new Date(iso).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: false })
}

function PublicBookingPage() {
  const { slug } = useParams()
  const { user, isAuthenticated, login, registerCustomer, logout } = useAuth()
  const queryClient = useQueryClient()

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
  const [view, setView] = useState('booking')
  const [reviewingId, setReviewingId] = useState(null)
  const [viewingProfile, setViewingProfile] = useState(null)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [headerAuthMode, setHeaderAuthMode] = useState('login')
  const [headerContact, setHeaderContact] = useState({ name: '', email: '', phone: '', password: '' })
  const [headerAuthError, setHeaderAuthError] = useState('')
  const [headerAuthSubmitting, setHeaderAuthSubmitting] = useState(false)

  const isCustomerSession = isAuthenticated && user?.role === 'customer'

  const { data: barbershop, isLoading: loadingBarbershop, isError: barbershopError } = useQuery({
    queryKey: ['public-barbershop', slug],
    queryFn: () => getPublicBarbershop(slug),
    // A bad/expired slug is a 404, not a transient failure — retrying just delays
    // showing the "not available" message behind three rounds of backoff.
    retry: false,
  })
  const { data: myAppointments = [] } = useQuery({
    queryKey: ['my-appointments'],
    queryFn: () => listMyAppointments(),
    enabled: isCustomerSession,
  })
  const { data: myReviews = [] } = useQuery({
    queryKey: ['my-reviews'],
    queryFn: listMyReviews,
    enabled: isCustomerSession,
  })

  const myAppointmentsHere = useMemo(
    () =>
      myAppointments
        .filter((a) => a.barbershop === barbershop?._id)
        .sort((a, b) => new Date(b.startTime) - new Date(a.startTime)),
    [myAppointments, barbershop]
  )
  const reviewedAppointmentIds = useMemo(() => new Set(myReviews.map((r) => r.appointment)), [myReviews])

  const cancelMutation = useMutation({
    mutationFn: cancelMyAppointment,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['my-appointments'] }),
  })
  const { data: barbers = [] } = useQuery({
    queryKey: ['public-barbers', slug],
    queryFn: () => listPublicBarbers(slug),
    retry: false,
  })
  const { data: services = [] } = useQuery({
    queryKey: ['public-services', slug],
    queryFn: () => listPublicServices(slug),
    retry: false,
  })
  const { data: portfolioPhotos = [] } = useQuery({
    queryKey: ['public-portfolio', slug],
    queryFn: () => listPublicPortfolio(slug),
    retry: false,
  })

  const photosByBarber = useMemo(() => {
    const map = new Map()
    for (const p of portfolioPhotos) {
      const list = map.get(p.barber) || []
      list.push(p)
      map.set(p.barber, list)
    }
    return map
  }, [portfolioPhotos])

  const days = useMemo(() => nextDays(7), [])
  const selectedKey = toDateKey(selectedDate)

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

  async function handleHeaderAuth(e) {
    e.preventDefault()
    setHeaderAuthError('')
    setHeaderAuthSubmitting(true)
    try {
      if (headerAuthMode === 'register') {
        await registerCustomer({
          name: headerContact.name,
          email: headerContact.email,
          password: headerContact.password,
          phone: headerContact.phone,
        })
      } else {
        await login(headerContact.email, headerContact.password)
      }
      setShowAuthModal(false)
      setHeaderContact({ name: '', email: '', phone: '', password: '' })
    } catch (err) {
      setHeaderAuthError(err.response?.data?.error || 'No pudimos iniciar sesión. Intenta de nuevo.')
    } finally {
      setHeaderAuthSubmitting(false)
    }
  }

  if (loadingBarbershop) {
    return (
      <div className="flex min-h-screen flex-col bg-bg">
        <div className="flex flex-1 items-center justify-center">
          <span className="text-sm text-muted">Cargando…</span>
        </div>
        <PoweredByCortio />
      </div>
    )
  }

  if (barbershopError || !barbershop) {
    return (
      <div className="flex min-h-screen flex-col bg-bg">
        <div className="flex flex-1 items-center justify-center px-4">
          <div className="text-center">
            <p className="text-sm font-medium text-ink">Esta barbería no se encuentra disponible.</p>
            <p className="mt-1.5 text-xs text-muted">Verifica el enlace o contacta directamente a la barbería.</p>
          </div>
        </div>
        <PoweredByCortio />
      </div>
    )
  }

  if (confirmed) {
    return (
      <div className="flex min-h-screen flex-col bg-bg">
        <div className="flex flex-1 items-center justify-center px-4">
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
        <PoweredByCortio />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-bg">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-2xl items-start justify-between px-4 py-6">
          <div className="flex items-center gap-3">
            {barbershop.logoUrl && (
              <img
                src={resolveAssetUrl(barbershop.logoUrl)}
                alt=""
                className="h-10 w-10 shrink-0 rounded-lg object-cover"
              />
            )}
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
          </div>
          <div className="flex items-center gap-3">
            {isCustomerSession ? (
              <>
                <button
                  type="button"
                  onClick={() => setView(view === 'booking' ? 'myAppointments' : 'booking')}
                  className="flex items-center gap-1.5 text-sm font-medium text-muted hover:text-ink"
                >
                  <CalendarClock size={15} />
                  {view === 'booking' ? 'Mis citas' : 'Agendar nueva cita'}
                </button>
                <button type="button" onClick={logout} className="text-sm font-medium text-muted hover:text-ink">
                  Cerrar sesión
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setShowAuthModal(true)}
                className="text-sm font-medium text-muted hover:text-ink"
              >
                Iniciar sesión
              </button>
            )}
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
        {view === 'myAppointments' ? (
          <Card>
            <h2 className="text-base font-semibold text-ink">Mis citas</h2>
            {myAppointmentsHere.length === 0 ? (
              <p className="mt-4 text-sm text-muted">Aún no tienes citas en esta barbería.</p>
            ) : (
              <div className="mt-4 flex flex-col divide-y divide-border">
                {myAppointmentsHere.map((a) => (
                  <div key={a._id} className="py-3.5 first:pt-0 last:pb-0">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-ink">{a.service?.name}</p>
                        <p className="text-xs text-muted">
                          {a.barber?.name} ·{' '}
                          {new Date(a.startTime).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })} ·{' '}
                          {formatTime(a.startTime)}
                        </p>
                      </div>
                      <span className="shrink-0 text-xs text-muted">{STATUS_LABEL[a.status]}</span>
                    </div>

                    {(a.status === 'pending' || a.status === 'confirmed') && (
                      <button
                        type="button"
                        onClick={() => cancelMutation.mutate(a._id)}
                        disabled={cancelMutation.isPending && cancelMutation.variables === a._id}
                        className="mt-2 text-xs font-medium text-danger underline disabled:opacity-50"
                      >
                        {cancelMutation.isPending && cancelMutation.variables === a._id ? 'Cancelando...' : 'Cancelar cita'}
                      </button>
                    )}

                    {a.status === 'completed' && !reviewedAppointmentIds.has(a._id) && (
                      reviewingId === a._id ? (
                        <ReviewForm appointmentId={a._id} onDone={() => setReviewingId(null)} />
                      ) : (
                        <button
                          type="button"
                          onClick={() => setReviewingId(a._id)}
                          className="mt-2 text-xs font-medium text-ink underline"
                        >
                          Calificar
                        </button>
                      )
                    )}
                    {reviewedAppointmentIds.has(a._id) && (
                      <p className="mt-1.5 text-xs text-success">Ya calificaste esta cita, ¡gracias!</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        ) : (
        <>
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
                    <BarberCard
                      key={b._id}
                      barber={b}
                      selected={barber?._id === b._id}
                      onSelect={() => selectBarber(b)}
                      onViewProfile={() => setViewingProfile(b)}
                    />
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
                  <CustomerAuthForm
                    idPrefix="contact"
                    mode={authMode}
                    setMode={setAuthMode}
                    contact={contact}
                    setContact={setContact}
                    onSubmit={handleConfirm}
                    submitting={submitting}
                    error={bookingError}
                    submitLabel={authMode === 'register' ? 'Crear cuenta y confirmar' : 'Iniciar sesión y confirmar'}
                  />
                </div>
              )}
            </div>
          )}
        </Card>
        </>
        )}
      </main>

      <PoweredByCortio />

      <Modal
        open={showAuthModal}
        onClose={() => {
          setShowAuthModal(false)
          setHeaderAuthError('')
        }}
        title="Inicia sesión o crea tu cuenta"
      >
        <CustomerAuthForm
          idPrefix="header"
          mode={headerAuthMode}
          setMode={setHeaderAuthMode}
          contact={headerContact}
          setContact={setHeaderContact}
          onSubmit={handleHeaderAuth}
          submitting={headerAuthSubmitting}
          error={headerAuthError}
          submitLabel={headerAuthMode === 'register' ? 'Crear cuenta' : 'Iniciar sesión'}
        />
      </Modal>

      <Modal open={Boolean(viewingProfile)} onClose={() => setViewingProfile(null)} title="Perfil del barbero">
        {viewingProfile && (
          <div>
            <div className="flex items-center gap-4">
              {viewingProfile.avatarUrl ? (
                <img
                  src={resolveAssetUrl(viewingProfile.avatarUrl)}
                  alt=""
                  className="h-16 w-16 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-surface-2 text-lg font-medium text-ink">
                  <UserRound size={24} className="text-muted" />
                </div>
              )}
              <div>
                <p className="text-base font-semibold text-ink">{viewingProfile.name}</p>
                {viewingProfile.rating != null && (
                  <div className="mt-0.5 flex items-center gap-1 text-xs text-muted">
                    <Star size={12} className="fill-ink text-ink" />
                    {viewingProfile.rating} · {viewingProfile.reviewsCount} reseñas
                  </div>
                )}
              </div>
            </div>

            <div className="mt-5">
              <p className="mb-2 text-sm font-medium text-muted">Portafolio de trabajos</p>
              {(photosByBarber.get(viewingProfile._id) || []).length === 0 ? (
                <p className="text-sm text-muted">Aún no ha subido fotos de sus trabajos.</p>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {photosByBarber.get(viewingProfile._id).map((p) => (
                    <div key={p._id} className="relative aspect-square overflow-hidden rounded-lg bg-surface-2">
                      <img src={resolveAssetUrl(p.imageUrl)} alt={p.description || ''} className="h-full w-full object-cover" />
                      {/* Always visible (not hover-only) — most customers browse this on mobile, which has no hover state. */}
                      {(p.service?.name || p.description) && (
                        <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/80 to-transparent p-1.5 pt-4">
                          {p.service?.name && <p className="truncate text-[11px] font-medium text-white">{p.service.name}</p>}
                          {p.description && <p className="truncate text-[10px] text-white/80">{p.description}</p>}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Button
              type="button"
              onClick={() => {
                selectBarber(viewingProfile)
                setViewingProfile(null)
              }}
              className="mt-5 w-full"
            >
              Elegir a {viewingProfile.name.split(' ')[0]}
            </Button>
          </div>
        )}
      </Modal>
    </div>
  )
}

export default PublicBookingPage
