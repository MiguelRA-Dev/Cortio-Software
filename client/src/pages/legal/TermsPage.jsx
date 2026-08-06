import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

function TermsPage() {
  return (
    <div className="min-h-screen bg-bg">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-6">
          <span className="text-xl font-semibold tracking-tight text-ink">Cortio</span>
          <Link to="/register" className="flex items-center gap-1.5 text-sm text-muted hover:text-ink">
            <ArrowLeft size={14} /> Volver
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-10">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Términos y condiciones</h1>
        <p className="mt-1 text-sm text-muted">Última actualización: agosto de 2026</p>

        <div className="mt-8 flex flex-col gap-6 text-sm leading-relaxed text-ink">
          <section>
            <h2 className="text-base font-semibold text-ink">1. Qué es Cortio</h2>
            <p className="mt-2 text-muted">
              Cortio es una plataforma de software como servicio (SaaS) que ayuda a barberías a gestionar citas,
              clientes, inventario, ventas, nómina y su suscripción de pago. Al crear una cuenta, aceptas estos
              términos en nombre tuyo y, si registras una barbería, en nombre de tu negocio.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-ink">2. Tu cuenta</h2>
            <p className="mt-2 text-muted">
              Eres responsable de la información que registras y de mantener segura tu contraseña. Si eres dueño de
              una barbería, eres responsable de los datos de tus barberos y clientes que cargues o generes dentro de
              la plataforma, y de contar con su consentimiento cuando la ley lo requiera.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-ink">3. Suscripción y pagos</h2>
            <p className="mt-2 text-muted">
              Las barberías cuentan con un período de prueba gratuito. Al vencer, el uso continuo de las funciones
              del panel requiere una suscripción paga, procesada a través de nuestro proveedor de pagos (Wompi).
              Puedes cancelar tu suscripción en cualquier momento desde Configuración; los cobros ya realizados no
              son reembolsables salvo que la ley disponga lo contrario.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-ink">4. Eliminación de cuenta</h2>
            <p className="mt-2 text-muted">
              Puedes solicitar la eliminación de tu barbería desde Configuración. Al hacerlo, el acceso se bloquea de
              inmediato y todos los datos se eliminan de forma permanente 15 días después, salvo que canceles la
              solicitud antes de esa fecha.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-ink">5. Uso aceptable</h2>
            <p className="mt-2 text-muted">
              No debes usar Cortio para actividades ilegales, para enviar spam, ni para intentar vulnerar la
              seguridad de la plataforma o de otros usuarios.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-ink">6. Limitación de responsabilidad</h2>
            <p className="mt-2 text-muted">
              Cortio se ofrece "tal cual". Hacemos lo posible por mantener el servicio disponible y tus datos
              seguros, pero no garantizamos que la plataforma esté libre de errores en todo momento.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-ink">7. Cambios a estos términos</h2>
            <p className="mt-2 text-muted">
              Podemos actualizar estos términos ocasionalmente. Si el cambio es significativo, te avisaremos por
              correo o dentro de la aplicación.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-ink">8. Contacto</h2>
            <p className="mt-2 text-muted">
              Si tienes preguntas sobre estos términos, escríbenos al correo de soporte indicado en la aplicación.
            </p>
          </section>
        </div>
      </main>
    </div>
  )
}

export default TermsPage
