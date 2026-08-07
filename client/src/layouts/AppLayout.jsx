import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  LayoutDashboard,
  Calendar,
  Scissors,
  Users,
  Contact,
  Package,
  ShoppingCart,
  Receipt,
  Wallet,
  BarChart3,
  Settings,
  CreditCard,
  UserCircle,
  LogOut,
  Menu,
  X,
  MessageCircle,
} from 'lucide-react'
import ThemeToggle from '../components/ui/ThemeToggle'
import { useAuth } from '../context/AuthContext'
import { getBillingStatus } from '../api/billing'

const OWNER_NAV_ITEMS = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/app' },
  { label: 'Agenda', icon: Calendar, path: '/app/appointments' },
  { label: 'Servicios', icon: Scissors, path: '/app/services' },
  { label: 'Equipo', icon: Users, path: '/app/team' },
  { label: 'Clientes', icon: Contact, path: '/app/customers' },
  { label: 'Inventario', icon: Package, path: '/app/inventory' },
  { label: 'Ventas (POS)', icon: ShoppingCart, path: '/app/sales' },
  { label: 'Gastos', icon: Receipt, path: '/app/expenses' },
  { label: 'Nómina', icon: Wallet, path: '/app/payroll' },
  { label: 'Reportes', icon: BarChart3, path: '/app/reports' },
]

// Matches what the backend actually allows a barber to do: their own appointments
// (GET/PATCH /api/appointments), and POS (POST/GET /api/sales allows role owner|barber).
const BARBER_NAV_ITEMS = [
  { label: 'Mi día', icon: LayoutDashboard, path: '/app' },
  { label: 'Mi agenda', icon: Calendar, path: '/app/appointments' },
  { label: 'Ventas (POS)', icon: ShoppingCart, path: '/app/sales' },
  { label: 'Mi nómina', icon: Wallet, path: '/app/payroll' },
  { label: 'Mi perfil', icon: UserCircle, path: '/app/profile' },
]

function initials(name) {
  return (name || '')
    .split(' ')
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase()
}

function NavItem({ item, onClick }) {
  const Icon = item.icon
  return (
    <NavLink
      to={item.path}
      end={item.path === '/app'}
      onClick={onClick}
      className={({ isActive }) =>
        `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
          isActive
            ? 'bg-surface-2 text-ink'
            : 'text-muted hover:bg-surface-2 hover:text-ink'
        }`
      }
    >
      <Icon size={17} strokeWidth={2} />
      {item.label}
    </NavLink>
  )
}

function SidebarContent({ onNavigate }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const navItems = user.role === 'barber' ? BARBER_NAV_ITEMS : OWNER_NAV_ITEMS

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <>
      <div className="flex items-center gap-2 px-3 pb-6 pt-1">
        <span className="text-xl font-semibold tracking-tight text-ink">Cortio Software</span>
      </div>

      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto">
        {navItems.map((item) => (
          <NavItem key={item.path} item={item} onClick={onNavigate} />
        ))}
      </nav>

      <div className="border-t border-border pt-3">
        <div className="mb-2 flex items-center gap-3 px-1 py-1.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-2 text-xs font-medium text-ink">
            {initials(user.name)}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-ink">{user.name}</p>
            <p className="truncate text-xs capitalize text-muted">{user.role === 'owner' ? 'Dueño' : 'Barbero'}</p>
          </div>
        </div>
        {user.role === 'owner' && (
          <>
            <NavItem item={{ label: 'Facturación', icon: CreditCard, path: '/app/billing' }} onClick={onNavigate} />
            <NavItem item={{ label: 'Configuración', icon: Settings, path: '/app/settings' }} onClick={onNavigate} />
          </>
        )}
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted transition-colors hover:bg-surface-2 hover:text-ink"
        >
          <LogOut size={17} strokeWidth={2} />
          Cerrar sesión
        </button>
      </div>
    </>
  )
}

function SubscriptionBanner() {
  const { user } = useAuth()
  const { data: status } = useQuery({ queryKey: ['billing-status'], queryFn: getBillingStatus, staleTime: 60_000 })

  if (!status) return null

  if (status.deletionRequestedAt) {
    const purgeDate = new Date(status.scheduledPurgeAt).toLocaleDateString('es-CO', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
    return (
      <div className="border-b border-danger/30 bg-danger/10 px-4 py-2 text-center text-sm text-danger">
        Esta barbería se eliminará permanentemente el {purgeDate}.{' '}
        {user.role === 'owner' ? (
          <NavLink to="/app/settings" className="font-medium underline">
            Cancelar eliminación
          </NavLink>
        ) : (
          'Contacta al dueño si esto no era lo esperado.'
        )}
      </div>
    )
  }

  if (status.blocked) {
    return (
      <div className="border-b border-danger/30 bg-danger/10 px-4 py-2 text-center text-sm text-danger">
        Tu suscripción no está activa y el acceso al panel está bloqueado.{' '}
        <NavLink to="/app/billing" className="font-medium underline">
          Ir a Facturación
        </NavLink>
      </div>
    )
  }

  if (status.subscriptionStatus === 'trialing' && status.trialDaysLeft !== null) {
    return (
      <div className="border-b border-border bg-surface-2 px-4 py-2 text-center text-sm text-muted">
        Te quedan {status.trialDaysLeft} día(s) de prueba gratis.{' '}
        <NavLink to="/app/billing" className="font-medium text-ink underline">
          Ver facturación
        </NavLink>
      </div>
    )
  }

  return null
}

function EmailVerificationBanner() {
  const { user } = useAuth()

  // Barbers don't go through the self-registration/verification flow — their accounts
  // are created by the owner, so this only applies to the person who actually signed up.
  if (user.role !== 'owner' || user.emailVerified) return null

  return (
    <div className="border-b border-border bg-surface-2 px-4 py-2 text-center text-sm text-muted">
      Tu correo aún no está verificado.{' '}
      <NavLink to="/app/settings" className="font-medium text-ink underline">
        Ver detalles
      </NavLink>
    </div>
  )
}

const SUPPORT_WHATSAPP_NUMBER = '573118205548'

function SupportWhatsAppButton() {
  return (
    <a
      href={`https://wa.me/${SUPPORT_WHATSAPP_NUMBER}`}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-5 right-5 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg transition-transform hover:scale-105"
      aria-label="Contactar soporte por WhatsApp"
      title="Contactar soporte por WhatsApp"
    >
      <MessageCircle size={26} strokeWidth={2} />
    </a>
  )
}

function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const { user } = useAuth()

  return (
    <div className="min-h-screen bg-bg">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-border bg-surface p-4 lg:flex">
        <SidebarContent />
      </aside>

      {/* Mobile sidebar (drawer) */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative flex h-full w-64 flex-col border-r border-border bg-surface p-4">
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="absolute right-3 top-3 text-muted hover:text-ink"
              aria-label="Cerrar menú"
            >
              <X size={18} />
            </button>
            <SidebarContent onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      <div className="lg:pl-64">
        <SubscriptionBanner />
        <EmailVerificationBanner />
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-bg/80 px-4 py-3 backdrop-blur">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="text-muted hover:text-ink lg:hidden"
              aria-label="Abrir menú"
            >
              <Menu size={20} />
            </button>
            <span className="text-sm font-medium text-muted">{user.name}</span>
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <div className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-surface-2 text-xs font-medium text-ink">
              {initials(user.name)}
            </div>
          </div>
        </header>

        <main className="p-4 lg:p-8">
          <Outlet />
        </main>
      </div>

      <SupportWhatsAppButton />
    </div>
  )
}

export default AppLayout
