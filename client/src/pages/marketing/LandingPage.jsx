import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  CalendarCheck,
  ShoppingCart,
  BarChart3,
  Users,
  Smartphone,
  MessageCircle,
  ShieldCheck,
  X,
  ArrowRight,
  Star,
  ChevronDown,
  DollarSign,
  TrendingUp,
} from 'lucide-react'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import Logo from '../../components/ui/Logo'
import ThemeToggle from '../../components/ui/ThemeToggle'
import Switch from '../../components/ui/Switch'
import StatTile from '../../components/ui/StatTile'
import RankedBarList from '../../components/reports/RankedBarList'
import StaffCalendarView from '../../components/appointments/StaffCalendarView'
import { CatalogGrid } from '../owner/SalesPage'
import { useTheme } from '../../context/ThemeContext'
import { formatCOP } from '../../lib/format'

const MONTHLY_PRICE_COP = 64900
// Equivalent to 10 months (2 free) at the monthly price. Billing for this cycle isn't
// wired up in MercadoPago yet — display only, until that ships.
const ANNUAL_PRICE_COP = 649000
const TRIAL_DAYS = 30

// Each screenshot needs a light-mode twin (e.g. dashboard.png + dashboard-light.png)
// so the landing matches whichever theme the visitor's toggle is on — see themedSrc.
function themedSrc(name, theme) {
  return `/landing/${name}${theme === 'light' ? '-light' : ''}.png`
}

// Real payoff data for the "Sabe si estás ganando o perdiendo" preview — same shape
// StatTile/RankedBarList already take on the real Reportes page.
const DEMO_INCOME = 4850000
const DEMO_PROFIT = 2100000
const DEMO_SERVICES = [
  { label: 'Corte + Barba', value: 1620000 },
  { label: 'Color', value: 980000 },
  { label: 'Corte clásico', value: 740000 },
]

// Made-up names, not any real professional — same fields TeamPage.jsx reads.
const DEMO_TEAM = [
  { name: 'Sebastián Ríos', paymentScheme: 'commission', commissionRate: 50, active: true },
  { name: 'Mateo Salazar', paymentScheme: 'fixed', baseSalary: 1200000, active: true },
  { name: 'Andrés Vélez', paymentScheme: 'mixed', baseSalary: 600000, commissionRate: 30, active: false },
]

// Same paymentSummary logic TeamPage.jsx uses for its real list, duplicated here —
// `initials` below already exists further down this file and is reused as-is.
function paymentSummary(barber) {
  if (barber.paymentScheme === 'fixed') return `Fijo · ${formatCOP(barber.baseSalary || 0)}`
  if (barber.paymentScheme === 'commission') return `Comisión · ${barber.commissionRate}%`
  return `Mixto · ${formatCOP(barber.baseSalary || 0)} + ${barber.commissionRate}%`
}

// Made-up names, not any real professional — same fields AppointmentsPage.jsx builds
// for StaffCalendarView's events prop.
const DEMO_BARBERS = [
  { id: 'demo-a', name: 'Sebastián Ríos' },
  { id: 'demo-b', name: 'Mateo Salazar' },
]

function demoTime(hour, minute = 0) {
  const d = new Date()
  d.setHours(hour, minute, 0, 0)
  return d
}

const DEMO_EVENTS = [
  { id: 'e1', resourceId: 'demo-a', customer: 'Juan Pérez', service: 'Corte + Barba', status: 'confirmed', start: demoTime(9, 0), end: demoTime(9, 45) },
  { id: 'e2', resourceId: 'demo-a', customer: 'Andrés Ruiz', service: 'Corte clásico', status: 'completed', start: demoTime(10, 0), end: demoTime(10, 30) },
  { id: 'e3', resourceId: 'demo-a', customer: 'María Gómez', service: 'Color', status: 'cancelled', cancelledBy: 'customer', start: demoTime(11, 0), end: demoTime(12, 0) },
  { id: 'e4', resourceId: 'demo-b', customer: 'Camila Torres', service: 'Barba', status: 'pending', start: demoTime(9, 30), end: demoTime(10, 0) },
  { id: 'e5', resourceId: 'demo-b', customer: 'Kevin Ortiz', service: 'Corte + Barba', status: 'confirmed', start: demoTime(11, 0), end: demoTime(11, 45) },
]

// Renders the real day-view calendar (react-big-calendar is already in the bundle —
// AppointmentsPage.jsx uses this same component, so this adds no extra weight).
// Only here, minTime/maxTime narrow the visible range to a 3-hour window that fits
// every demo event (9:00-12:00) exactly within `height` — the library's time grid
// scrolls internally whenever content is taller than its container, so the only way
// to remove that scrollbar (rather than just resetting its position) is to make sure
// nothing overflows in the first place. The real Agenda page is untouched — it never
// passes these props, so it keeps the full 24h with normal scrolling.
function AgendaPreview() {
  return (
    <Card className="p-4">
      <StaffCalendarView
        date={new Date()}
        onNavigate={() => {}}
        resources={DEMO_BARBERS}
        events={DEMO_EVENTS}
        height={390}
        minTime={demoTime(9, 0)}
        maxTime={demoTime(12, 0)}
      />
    </Card>
  )
}

// Real catalog + ticket data for the "Ventas" preview.
const DEMO_CATALOG = [
  { _id: 's1', name: 'Corte clásico', price: 25000 },
  { _id: 's2', name: 'Barba', price: 15000 },
  { _id: 's3', name: 'Color', price: 60000 },
]
const DEMO_TICKET = [
  { itemType: 'Service', itemId: 's1', name: 'Corte clásico', unitPrice: 25000, quantity: 1 },
  { itemType: 'Service', itemId: 's2', name: 'Barba', unitPrice: 15000, quantity: 1 },
]
const DEMO_TICKET_TOTAL = DEMO_TICKET.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0)

// CatalogGrid is the real, exported component from SalesPage.jsx — the ticket list
// below matches that page's markup exactly, since it isn't split into its own
// component there yet.
function VentasPreview() {
  return (
    <div className="flex flex-col gap-4">
      <Card>
        <h3 className="text-sm font-medium text-muted">Catálogo</h3>
        <div className="mt-4">
          <CatalogGrid items={DEMO_CATALOG} onAdd={() => {}} />
        </div>
      </Card>
      <Card>
        <div className="flex items-center gap-2">
          <ShoppingCart size={16} className="text-muted" />
          <h3 className="text-sm font-medium text-muted">Ticket actual</h3>
        </div>
        <div className="mt-4 flex flex-col divide-y divide-border">
          {DEMO_TICKET.map((item) => (
            <div key={item.itemId} className="flex items-center gap-2 py-3 first:pt-0 last:pb-0">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-ink">{item.name}</p>
                <p className="text-xs text-muted">{formatCOP(item.unitPrice)}</p>
              </div>
              <span className="w-5 text-center text-sm tabular-nums text-ink">{item.quantity}</span>
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
          <span className="text-sm font-medium text-muted">Total</span>
          <span className="text-xl font-semibold tabular-nums text-ink">{formatCOP(DEMO_TICKET_TOTAL)}</span>
        </div>
      </Card>
    </div>
  )
}

// Renders the actual Reportes UI components with made-up numbers, instead of a
// screenshot — stays crisp at any width and needs no light/dark twin.
function ReportesPreview() {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4">
        <StatTile label="Ingresos" value={formatCOP(DEMO_INCOME)} delta="+18%" deltaDirection="up" deltaTone="good" icon={DollarSign} />
        <StatTile label="Utilidad neta" value={formatCOP(DEMO_PROFIT)} delta="+9%" deltaDirection="up" deltaTone="good" icon={TrendingUp} />
      </div>
      <Card>
        <h3 className="text-sm font-medium text-muted">Rentabilidad por servicio</h3>
        <div className="mt-4">
          <RankedBarList items={DEMO_SERVICES} valueFormatter={formatCOP} />
        </div>
      </Card>
    </div>
  )
}

// Same list-row markup TeamPage.jsx renders for the real team, fed dummy names.
function EquipoPreview() {
  return (
    <Card>
      <div className="flex flex-col divide-y divide-border">
        {DEMO_TEAM.map((b) => (
          <div key={b.name} className="flex items-center gap-4 py-4 first:pt-0 last:pb-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-2 text-sm font-medium text-ink">
              {initials(b.name).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-ink">{b.name}</p>
              <p className="truncate text-xs text-muted">{paymentSummary(b)}</p>
            </div>
            <Switch checked={b.active} onChange={() => {}} />
          </div>
        ))}
      </div>
    </Card>
  )
}

const FEATURES = [
  {
    icon: CalendarCheck,
    title: 'Agenda que no se te enreda',
    description:
      'Calendario por profesional, en vivo. Cada cita con su servicio, su cliente y su estado — confirmada, completada, cancelada — de un vistazo.',
    preview: AgendaPreview,
  },
  {
    icon: ShoppingCart,
    title: 'Cobra sin salir de la app',
    description:
      'Registra ventas de servicios y productos, vincúlalas a la cita, y lleva el efectivo, la tarjeta y las transferencias del día sin una hoja de cálculo aparte.',
    preview: VentasPreview,
  },
  {
    icon: BarChart3,
    title: 'Sabe si estás ganando o perdiendo',
    description:
      'Ingresos, gastos, nómina y utilidad neta del mes, más qué servicio y qué profesional te está generando más plata.',
    preview: ReportesPreview,
  },
  {
    icon: Users,
    title: 'Tu equipo, con su propio esquema de pago',
    description:
      'Comisión, sueldo fijo o mixto — cada profesional con su regla, y su nómina calculada sola a partir de lo que realmente vendió.',
    preview: EquipoPreview,
  },
]

const TESTIMONIALS = [
  {
    name: 'Andrés Felipe Cano',
    role: 'Dueño de un establecimiento',
    quote:
      'Tenía la agenda en un cuaderno, las ventas en Excel y el inventario en la cabeza. Ahora entro a una sola app y ahí está todo, hasta desde el celular cuando no estoy en el local.',
  },
  {
    name: 'Juan Camilo Restrepo',
    role: 'Dueño de un establecimiento',
    quote:
      'Los clientes reservan solos desde el link y se acabaron las llamadas a cada rato preguntando disponibilidad. Los "no show" bajaron bastante desde que agendan ellos mismos.',
  },
  {
    name: 'Kevin Steven Ortiz',
    role: 'Dueño de un establecimiento',
    quote:
      'Por fin sé cuánto me está dejando cada servicio realmente, no solo cuánto entra de la caja. Con eso decidí quitar dos servicios que no me estaban dando nada.',
  },
]

const FAQS = [
  {
    question: '¿Necesito tarjeta de crédito para empezar?',
    answer:
      'No. Tienes 30 días de prueba gratis sin ingresar ningún método de pago, con acceso completo a todas las funciones — agenda, ventas, nómina, inventario, reportes y tu página pública de reservas. No hay una versión "limitada" de prueba.',
  },
  {
    question: '¿Puedo cancelar cuando quiera?',
    answer:
      'Sí, desde el panel, en cualquier momento, sin llamar a nadie ni escribir a soporte. Sigues teniendo acceso hasta el final del periodo que ya pagaste — no se te cobra de nuevo después de eso — y puedes deshacer la cancelación mientras no haya llegado esa fecha.',
  },
  {
    question: '¿Cómo pagan mis clientes la cita?',
    answer:
      'Tus clientes no pagan al reservar — agendan gratis y te pagan en el local como siempre (efectivo, tarjeta, transferencia). Lo único que se paga en línea es tu suscripción mensual o anual a Cortio. Cada venta que registras en el punto de venta queda ligada a la cita, así que tus reportes cuadran solos.',
  },
  {
    question: '¿Funciona bien desde el celular?',
    answer:
      'Sí. El panel se adapta a cualquier pantalla — celular, tablet o computador — sin instalar ninguna aplicación, y tus clientes reservan desde su celular de la misma forma. Es un sitio web normal, entra desde cualquier navegador.',
  },
  {
    question: '¿Puedo tener profesionales con esquemas de pago distintos?',
    answer:
      'Sí — cada profesional puede tener comisión sobre lo que vende, sueldo fijo, o una mezcla de los dos. La nómina se calcula automáticamente a partir de las ventas reales de cada uno, no hay que sacar cuentas a mano.',
  },
  {
    question: '¿Qué pasa con mis datos si dejo de pagar?',
    answer:
      'Nada se borra automáticamente — el panel se bloquea hasta que vuelvas a pagar, pero tu información sigue intacta. Si en algún momento decides eliminar tu cuenta por completo, tienes 15 días para cambiar de opinión antes de que se borre todo de forma permanente.',
  },
  {
    question: '¿Cuánto se demora en configurarse un establecimiento nuevo?',
    answer:
      'El registro toma un par de minutos: nombre, dirección y horario de atención, y ya tienes tu link de reservas activo. Agregar servicios y profesionales es igual de rápido — puedes ir completando el resto mientras ya estás recibiendo reservas.',
  },
  {
    question: '¿Puedo migrar mis citas o clientes desde otro sistema?',
    answer:
      'Hoy no hay una importación automática desde otras plataformas. Si tienes bastante información acumulada (clientes, historial), escríbenos y vemos cómo ayudarte a cargarla al empezar.',
  },
  {
    question: '¿Cuántos establecimientos puedo administrar con una cuenta?',
    answer:
      'Cada cuenta de dueño administra un establecimiento. Si tienes varias sedes, por ahora cada una necesita su propia cuenta y su propia suscripción — es algo que tenemos en la mira para más adelante.',
  },
  {
    question: '¿Los profesionales pueden ver la información financiera de todo el negocio?',
    answer:
      'No. Cada profesional solo ve su propia agenda, sus propias ventas y su propia nómina. El dueño es el único rol que ve el negocio completo — ingresos, gastos, utilidad y el desempeño de todo el equipo.',
  },
  {
    question: '¿Qué pasa si un cliente no llega a la cita?',
    answer:
      'La marcas como "No asistió" desde tu agenda con un clic. Queda registrada así en tus reportes, para que puedas identificar si es un patrón con algún cliente o algún horario en particular.',
  },
  {
    question: '¿Cortio cobra comisión sobre mis ventas?',
    answer:
      'No. La suscripción es un valor fijo mensual o anual, sin importar cuánto vendas. Todo lo que factures en servicios y productos es 100% tuyo — Cortio no toma porcentaje de tus ventas.',
  },
  {
    question: '¿Qué tan segura está la información de mi negocio?',
    answer:
      'Las contraseñas se guardan cifradas, todo el sitio corre bajo conexión segura (HTTPS), y los datos de cada establecimiento están separados de los de los demás — nadie de otro establecimiento puede ver tus citas, tus ventas ni tus clientes.',
  },
  {
    question: '¿Hay algún límite de citas, clientes o profesionales?',
    answer: 'No, ni en el plan mensual ni en el anual. Profesionales y clientes son ilimitados, y no hay tope de citas al mes.',
  },
  {
    question: '¿Qué pasa si necesito ayuda configurando mi cuenta?',
    answer:
      'Tienes soporte en español — te acompañamos configurando servicios, horarios, tu equipo y tu link de reservas para que actives lo más rápido posible.',
  },
]

function initials(name) {
  return name
    .split(' ')
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
}

// Fades + slides a section into place the first time it scrolls into view — plain
// IntersectionObserver, no animation library needed for something this small.
function Reveal({ children, className = '', delay = 0 }) {
  const ref = useRef(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return undefined
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.15 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={`transition-all duration-700 ease-out ${visible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'} ${className}`}
    >
      {children}
    </div>
  )
}

function Screenshot({ src, alt, className = '' }) {
  return (
    <div className={`overflow-hidden rounded-2xl border border-border shadow-2xl shadow-black/20 ${className}`}>
      <img src={src} alt={alt} className="w-full" loading="lazy" />
    </div>
  )
}

// Fixed dark bezel on purpose — real device bezels don't switch to white in light mode.
function PhoneMockup({ src, alt, className = '' }) {
  return (
    <div className={`overflow-hidden rounded-[1.6rem] border-6 border-neutral-900 bg-neutral-900 shadow-2xl shadow-black/40 ${className}`}>
      <img src={src} alt={alt} className="w-full" loading="lazy" />
    </div>
  )
}

// A laptop + phone product shot, angled like a real marketing photo instead of a flat
// screenshot.
function DeviceMockup({ laptopSrc, laptopAlt, phoneSrc, phoneAlt, className = '' }) {
  return (
    <div className={`relative ${className}`}>
      <div
        aria-hidden="true"
        className="absolute left-1/2 top-1/2 -z-10 h-[120%] w-[120%] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-25 blur-3xl"
        style={{ background: 'radial-gradient(circle, var(--accent) 0%, transparent 65%)' }}
      />

      <div className="-rotate-3">
        <div className="rounded-t-xl border-10 border-b-0 border-neutral-900 bg-neutral-900 shadow-2xl shadow-black/40">
          <div className="overflow-hidden rounded-sm bg-neutral-950">
            <img src={laptopSrc} alt={laptopAlt} className="w-full" loading="lazy" />
          </div>
        </div>
        <div className="relative h-3.5 rounded-b-lg bg-linear-to-b from-neutral-800 to-neutral-900">
          <div className="absolute left-1/2 top-0 h-1.5 w-20 -translate-x-1/2 rounded-b-md bg-neutral-950" />
        </div>
        <div className="mx-auto h-1.5 w-[70%] rounded-b-2xl bg-neutral-950" />
      </div>

      <PhoneMockup
        src={phoneSrc}
        alt={phoneAlt}
        className="absolute -bottom-10 right-0 w-[38%] rotate-[5deg] sm:-right-2 sm:w-[34%]"
      />
    </div>
  )
}

const FAQS_PREVIEW_COUNT = 6

function LandingPage() {
  const { theme } = useTheme()
  const [billingCycle, setBillingCycle] = useState('monthly')
  const [showAllFaqs, setShowAllFaqs] = useState(false)

  return (
    <div className="min-h-screen overflow-x-hidden bg-bg">
      <header className="sticky top-0 z-20 border-b border-border bg-bg/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <span className="flex items-center gap-2 text-lg font-semibold tracking-tight text-ink">
            <Logo className="h-7 w-7" />
            Cortio Software
          </span>

          <nav className="hidden items-center gap-8 text-sm font-medium text-muted md:flex">
            <a href="#caracteristicas" className="hover:text-ink">Características</a>
            <a href="#precio" className="hover:text-ink">Precio</a>
          </nav>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link to="/login">
              <Button variant="ghost">Iniciar sesión</Button>
            </Link>
            <Link to="/register" className="hidden sm:block">
              <Button>Regístrate gratis</Button>
            </Link>
          </div>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="bg-grid absolute inset-0 opacity-60" />
          <div className="relative mx-auto flex max-w-6xl flex-col items-center gap-20 px-6 pb-24 pt-16 md:flex-row md:gap-16 md:pb-32 md:pt-20">
            <div className="max-w-xl text-center md:w-2/5 md:text-left">
              <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3.5 py-1.5 text-xs font-medium text-muted">
                Software de gestión para establecimientos de belleza
              </span>
              <h1 className="mt-5 text-4xl font-semibold tracking-tight text-ink md:text-5xl">
                Dirige tu negocio, <span className="italic">no lo persigas</span>
              </h1>
              <p className="mt-5 text-lg text-muted">
                Agenda, ventas, nómina, inventario y reservas en línea — todo en un solo lugar, hecho para
                barberías, salones y estudios de uñas en Colombia.
              </p>
              <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row md:justify-start">
                <Link to="/register" className="w-full sm:w-auto">
                  <Button className="w-full px-6 py-3 text-base sm:w-auto">
                    Empieza gratis por {TRIAL_DAYS} días
                    <ArrowRight size={16} />
                  </Button>
                </Link>
                <a href="#caracteristicas" className="w-full sm:w-auto">
                  <Button variant="secondary" className="w-full px-6 py-3 text-base sm:w-auto">
                    Ver cómo funciona
                  </Button>
                </a>
              </div>
              <p className="mt-3 text-xs text-muted">Sin tarjeta para empezar</p>
            </div>

            <DeviceMockup
              laptopSrc={themedSrc('dashboard', theme)}
              laptopAlt="Panel de control con citas del día, ingresos, gastos y nómina del mes"
              phoneSrc={themedSrc('booking', theme)}
              phoneAlt="Página pública de reservas vista desde el celular de un cliente"
              className="mt-4 w-full max-w-lg animate-landing-float md:mt-0 md:w-3/5 md:max-w-xl"
            />
          </div>
        </section>

        {/* Trust strip */}
        <section className="border-y border-border bg-surface">
          <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 px-6 py-8 text-center sm:grid-cols-3">
            <div>
              <p className="text-sm font-medium text-ink">{TRIAL_DAYS} días de prueba gratis</p>
              <p className="mt-1 text-xs text-muted">Sin compromisos, cancela cuando quieras</p>
            </div>
            <div>
              <p className="text-sm font-medium text-ink">Hecho para Colombia</p>
              <p className="mt-1 text-xs text-muted">Pesos colombianos, pagos con MercadoPago</p>
            </div>
            <div>
              <p className="text-sm font-medium text-ink">Soporte en español</p>
              <p className="mt-1 text-xs text-muted">Te ayudamos a configurar tu establecimiento</p>
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="caracteristicas" className="mx-auto max-w-6xl px-6 py-20">
          <Reveal className="mx-auto max-w-xl text-center">
            <h2 className="text-3xl font-semibold tracking-tight text-ink">Todo lo que tu establecimiento necesita</h2>
            <p className="mt-3 text-muted">Sin planillas, sin cuadernos, sin adivinar cuánto ganaste este mes.</p>
          </Reveal>

          <div className="mt-16 flex flex-col gap-28">
            {FEATURES.map((feature, i) => {
              const Icon = feature.icon
              const reversed = i % 2 === 1
              return (
                <Reveal
                  key={feature.title}
                  className={`flex flex-col items-center gap-10 md:flex-row ${reversed ? 'md:flex-row-reverse' : ''}`}
                >
                  <div className="md:w-2/5">
                    <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-surface-2 text-ink">
                      <Icon size={20} />
                    </div>
                    <h3 className="mt-4 text-2xl font-semibold tracking-tight text-ink">{feature.title}</h3>
                    <p className="mt-3 text-muted">{feature.description}</p>
                  </div>
                  <div className="md:w-3/5">
                    {feature.preview ? <feature.preview /> : <Screenshot src={themedSrc(feature.image, theme)} alt={feature.imageAlt} />}
                  </div>
                </Reveal>
              )
            })}
          </div>
        </section>

        {/* Public booking */}
        <section className="border-y border-border bg-surface">
          <Reveal className="mx-auto flex max-w-6xl flex-col items-center gap-12 px-6 py-20 md:flex-row">
            <div className="md:w-1/2">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-surface-2 text-ink">
                <Smartphone size={20} />
              </div>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight text-ink">
                Tus clientes reservan solos, a cualquier hora
              </h2>
              <p className="mt-3 text-muted">
                Cada establecimiento tiene su propio link de reservas. El cliente elige profesional, servicio y
                horario disponible — sin llamadas, sin mensajes de WhatsApp a medianoche.
              </p>
              <ul className="mt-6 flex flex-col gap-3 text-sm text-ink">
                <li className="flex items-start gap-2.5">
                  <ShieldCheck size={16} className="mt-0.5 shrink-0 text-muted" />
                  Solo se muestran los horarios realmente disponibles de cada profesional
                </li>
                <li className="flex items-start gap-2.5">
                  <ShieldCheck size={16} className="mt-0.5 shrink-0 text-muted" />
                  El cliente puede cancelar o reprogramar sin llamarte
                </li>
                <li className="flex items-start gap-2.5">
                  <ShieldCheck size={16} className="mt-0.5 shrink-0 text-muted" />
                  Reseñas reales de clientes que ya pasaron por la silla
                </li>
              </ul>
            </div>
            <div className="md:w-1/2">
              <PhoneMockup
                src={themedSrc('booking', theme)}
                alt="Página pública de reservas, vista desde el celular de un cliente"
                className="mx-auto w-full max-w-55"
              />
            </div>
          </Reveal>
        </section>

        {/* WhatsApp notifications */}
        <section className="mx-auto max-w-6xl px-6 py-20">
          <Reveal className="flex flex-col items-center gap-12 md:flex-row">
            <div className="order-2 md:order-1 md:w-1/2">
              {/* A real WhatsApp screenshot, not a Cortio screen — its look doesn't
                  change with the site's theme toggle, so unlike the other mockups this
                  one has no light-mode twin. */}
              <PhoneMockup
                src="/landing/whatsapp.png"
                alt="Conversación de WhatsApp con los avisos de citas que recibe un profesional"
                className="mx-auto w-full max-w-55"
              />
            </div>
            <div className="order-1 md:order-2 md:w-1/2">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-surface-2 text-ink">
                <MessageCircle size={20} />
              </div>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight text-ink">
                Tus profesionales se enteran al instante
              </h2>
              <p className="mt-3 text-muted">
                Cada cita queda avisada por WhatsApp directo al celular del profesional — sin que tengas que
                escribirle tú ni pasarle la agenda del día.
              </p>
              <ul className="mt-6 flex flex-col gap-3 text-sm text-ink">
                <li className="flex items-start gap-2.5">
                  <ShieldCheck size={16} className="mt-0.5 shrink-0 text-muted" />
                  Cita nueva, cancelada o reprogramada, al momento
                </li>
                <li className="flex items-start gap-2.5">
                  <ShieldCheck size={16} className="mt-0.5 shrink-0 text-muted" />
                  Recordatorio automático antes de la hora de la cita
                </li>
                <li className="flex items-start gap-2.5">
                  <ShieldCheck size={16} className="mt-0.5 shrink-0 text-muted" />
                  Directo al WhatsApp del profesional, sin grupos ni reenvíos manuales
                </li>
              </ul>
            </div>
          </Reveal>
        </section>

        {/* Testimonials */}
        <section className="mx-auto max-w-6xl px-6 py-20">
          <Reveal className="mx-auto max-w-xl text-center">
            <h2 className="text-3xl font-semibold tracking-tight text-ink">Dueños de negocio, no clientes de prueba</h2>
            <p className="mt-3 text-muted">Así les ha ido a algunos de los que ya la usan.</p>
          </Reveal>

          <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
            {TESTIMONIALS.map((t, i) => (
              <Reveal key={t.name} delay={i * 100}>
                <Card className="flex h-full flex-col transition-transform duration-300 hover:-translate-y-1">
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Star key={n} size={14} className="fill-ink text-ink" />
                    ))}
                  </div>
                  <p className="mt-4 flex-1 text-sm text-muted">"{t.quote}"</p>
                  <div className="mt-6 flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-2 text-sm font-medium text-ink">
                      {initials(t.name)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-ink">{t.name}</p>
                      <p className="text-xs text-muted">{t.role}</p>
                    </div>
                  </div>
                </Card>
              </Reveal>
            ))}
          </div>
        </section>

        {/* Pricing */}
        <section id="precio" className="mx-auto max-w-6xl px-6 py-20">
          <Reveal className="mx-auto max-w-xl text-center">
            <h2 className="text-3xl font-semibold tracking-tight text-ink">Empieza gratis, paga cuando quieras</h2>
            <p className="mt-3 text-muted">
              Todas las funciones incluidas desde el primer día — el plan pago solo suma las notificaciones de
              WhatsApp.
            </p>
          </Reveal>

          <Reveal className="mx-auto mt-8 flex max-w-3xl justify-center">
            <div className="inline-flex gap-1 rounded-lg border border-border bg-surface-2 p-1">
              <button
                type="button"
                onClick={() => setBillingCycle('monthly')}
                className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
                  billingCycle === 'monthly' ? 'bg-accent text-accent-ink' : 'text-muted hover:text-ink'
                }`}
              >
                Mensual
              </button>
              <button
                type="button"
                onClick={() => setBillingCycle('annual')}
                className={`flex items-center gap-2 rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
                  billingCycle === 'annual' ? 'bg-accent text-accent-ink' : 'text-muted hover:text-ink'
                }`}
              >
                Anual
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                    billingCycle === 'annual' ? 'bg-accent-ink/15 text-accent-ink' : 'bg-success/10 text-success'
                  }`}
                >
                  Ahorra 2 meses
                </span>
              </button>
            </div>
          </Reveal>

          <Reveal className="mx-auto mt-8 grid max-w-3xl grid-cols-1 gap-6 md:grid-cols-2">
            <Card className="flex flex-col text-center">
              <p className="text-sm font-medium text-muted">Plan gratis</p>
              <p className="mt-2 text-5xl font-semibold tracking-tight text-ink">$0</p>
              <p className="mt-1 text-sm text-muted">por {TRIAL_DAYS} días, sin tarjeta</p>

              <ul className="mt-8 flex flex-col gap-3 text-left text-sm text-ink">
                <li className="flex items-center gap-2.5">
                  <ShieldCheck size={16} className="text-muted" />
                  Profesionales y clientes ilimitados
                </li>
                <li className="flex items-center gap-2.5">
                  <ShieldCheck size={16} className="text-muted" />
                  Agenda, ventas, nómina, inventario y reportes
                </li>
                <li className="flex items-center gap-2.5">
                  <ShieldCheck size={16} className="text-muted" />
                  Página pública de reservas incluida
                </li>
                <li className="flex items-center gap-2.5 text-muted">
                  <X size={16} className="shrink-0" />
                  Sin notificaciones de WhatsApp
                </li>
              </ul>

              <Link to="/register" className="mt-8 block">
                <Button variant="secondary" className="w-full py-3 text-base">
                  Crear cuenta gratis
                </Button>
              </Link>
            </Card>

            <Card className="flex flex-col text-center">
              <p className="text-sm font-medium text-muted">
                {billingCycle === 'annual' ? 'Plan anual' : 'Plan mensual'}
              </p>
              <p className="mt-2 text-5xl font-semibold tracking-tight text-ink">
                {formatCOP(billingCycle === 'annual' ? ANNUAL_PRICE_COP : MONTHLY_PRICE_COP)}
              </p>
              <p className="mt-1 text-sm text-muted">
                {billingCycle === 'annual'
                  ? `por año — equivale a ${formatCOP(Math.round(ANNUAL_PRICE_COP / 12))}/mes`
                  : 'por mes, para todo tu establecimiento'}
              </p>

              <ul className="mt-8 flex flex-col gap-3 text-left text-sm text-ink">
                <li className="flex items-center gap-2.5">
                  <ShieldCheck size={16} className="text-muted" />
                  Todo lo del plan gratis
                </li>
                <li className="flex items-center gap-2.5">
                  <ShieldCheck size={16} className="text-muted" />
                  Notificaciones de WhatsApp para tus profesionales
                </li>
                <li className="flex items-center gap-2.5">
                  <ShieldCheck size={16} className="text-muted" />
                  Cita nueva, cancelada, reprogramada y recordatorio
                </li>
              </ul>

              <Link to="/register" className="mt-8 block">
                <Button className="w-full py-3 text-base">
                  Empieza gratis por {TRIAL_DAYS} días
                  <ArrowRight size={16} />
                </Button>
              </Link>
            </Card>
          </Reveal>

          <p className="mx-auto mt-6 max-w-md text-center text-xs text-muted">
            Los {TRIAL_DAYS} días de prueba aplican para cualquiera de los dos — puedes activar el plan pago cuando
            quieras desde el panel, y WhatsApp se enciende automáticamente al hacerlo.
          </p>
        </section>

        {/* FAQ */}
        <section className="mx-auto max-w-3xl px-6 py-20">
          <Reveal className="text-center">
            <h2 className="text-3xl font-semibold tracking-tight text-ink">Preguntas frecuentes</h2>
          </Reveal>

          <div className="mt-10 flex flex-col gap-3">
            {(showAllFaqs ? FAQS : FAQS.slice(0, FAQS_PREVIEW_COUNT)).map((faq, i) => (
              <Reveal key={faq.question} delay={i * 60}>
                <details className="group rounded-xl border border-border bg-surface px-5 py-4">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-medium text-ink marker:content-none">
                    {faq.question}
                    <ChevronDown size={16} className="shrink-0 text-muted transition-transform group-open:rotate-180" />
                  </summary>
                  <p className="mt-3 text-sm text-muted">{faq.answer}</p>
                </details>
              </Reveal>
            ))}
          </div>

          {!showAllFaqs && FAQS.length > FAQS_PREVIEW_COUNT && (
            <div className="mt-6 text-center">
              <Button variant="secondary" onClick={() => setShowAllFaqs(true)}>
                Ver las {FAQS.length - FAQS_PREVIEW_COUNT} preguntas restantes
                <ChevronDown size={15} />
              </Button>
            </div>
          )}
        </section>

        {/* Bottom CTA */}
        <section className="border-t border-border bg-surface">
          <Reveal className="mx-auto max-w-6xl px-6 py-20 text-center">
            <h2 className="text-3xl font-semibold tracking-tight text-ink">
              Deja de administrar tu establecimiento a mano
            </h2>
            <p className="mx-auto mt-3 max-w-md text-muted">
              Crea tu cuenta en menos de dos minutos y prueba Cortio Software gratis por {TRIAL_DAYS} días.
            </p>
            <Link to="/register" className="mt-8 inline-block">
              <Button className="px-6 py-3 text-base">
                Crear mi cuenta
                <ArrowRight size={16} />
              </Button>
            </Link>
          </Reveal>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 text-sm text-muted sm:flex-row">
          <span className="flex items-center gap-2 text-ink">
            <Logo className="h-5 w-5" />
            Cortio Software
          </span>
          <div className="flex items-center gap-6">
            <Link to="/terms" className="hover:text-ink">Términos</Link>
            <Link to="/privacy" className="hover:text-ink">Privacidad</Link>
          </div>
          <span>© {new Date().getFullYear()} Cortio Software</span>
        </div>
      </footer>
    </div>
  )
}

export default LandingPage
