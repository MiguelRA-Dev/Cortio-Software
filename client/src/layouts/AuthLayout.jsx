import ThemeToggle from '../components/ui/ThemeToggle'

function AuthLayout({ children }) {
  return (
    <div className="flex min-h-screen bg-bg">
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden border-r border-border bg-surface p-12 lg:flex">
        <div className="bg-grid absolute inset-0" />
        <div className="relative">
          <span className="text-2xl font-semibold tracking-tight text-ink">Cortio</span>
        </div>
        <div className="relative max-w-md">
          <h2 className="text-4xl font-semibold leading-tight tracking-tight text-ink">
            La plataforma hecha para barberías que quieren crecer.
          </h2>
          <p className="mt-4 text-muted">
            Agenda, pagos, nómina e inventario en un solo lugar.
          </p>
        </div>
        <div className="relative text-sm text-muted">© {new Date().getFullYear()} Cortio Software</div>
      </div>

      <div className="relative flex w-full flex-col items-center justify-center px-6 py-12 lg:w-1/2">
        <ThemeToggle className="absolute right-6 top-6" />
        <div className="mb-8 lg:hidden">
          <span className="text-2xl font-semibold tracking-tight text-ink">Cortio</span>
        </div>
        <div className="w-full max-w-sm">{children}</div>
      </div>
    </div>
  )
}

export default AuthLayout
