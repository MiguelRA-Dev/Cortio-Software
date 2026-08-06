import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

function PrivacyPage() {
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
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Política de privacidad</h1>
        <p className="mt-1 text-sm text-muted">Última actualización: agosto de 2026</p>

        <div className="mt-8 flex flex-col gap-6 text-sm leading-relaxed text-ink">
          <section>
            <p className="text-muted">
              En Cortio tratamos tus datos personales conforme a la Ley 1581 de 2012 de Colombia (Ley de Protección
              de Datos Personales) y sus decretos reglamentarios.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-ink">1. Qué datos recolectamos</h2>
            <ul className="mt-2 list-disc space-y-1.5 pl-5 text-muted">
              <li>Datos de cuenta: nombre, correo electrónico, teléfono y contraseña (cifrada).</li>
              <li>Datos del negocio: nombre de la barbería, dirección, horarios y logo, si registras una.</li>
              <li>Datos de uso: citas agendadas, ventas, gastos, nómina e inventario que registras en la plataforma.</li>
              <li>Datos de pago: se procesan directamente por Wompi; Cortio no almacena el número completo de tu tarjeta.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-ink">2. Para qué los usamos</h2>
            <p className="mt-2 text-muted">
              Para prestarte el servicio (agendamiento, facturación, reportes), enviarte notificaciones relacionadas
              con tu cuenta o tus citas, y para procesar tu suscripción.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-ink">3. Con quién los compartimos</h2>
            <p className="mt-2 text-muted">
              Solo con los proveedores que necesitamos para operar: Wompi (pagos), Resend (envío de correos),
              Google (inicio de sesión, si eliges usarlo) y MongoDB Atlas (almacenamiento de la base de datos). No
              vendemos tus datos a terceros.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-ink">4. Tus derechos</h2>
            <p className="mt-2 text-muted">
              Puedes acceder, corregir o eliminar tus datos en cualquier momento. Los dueños de barbería pueden
              eliminar su cuenta y todos sus datos desde Configuración (con 15 días de gracia antes de la
              eliminación definitiva). Los clientes pueden solicitar la eliminación de su cuenta escribiendo al
              correo de soporte.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-ink">5. Seguridad</h2>
            <p className="mt-2 text-muted">
              Tu contraseña se almacena cifrada y nunca en texto plano. Usamos conexiones seguras (HTTPS) para
              proteger la información que viaja entre tu dispositivo y nuestros servidores.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-ink">6. Contacto</h2>
            <p className="mt-2 text-muted">
              Para ejercer tus derechos o hacer preguntas sobre esta política, escríbenos al correo de soporte
              indicado en la aplicación.
            </p>
          </section>
        </div>
      </main>
    </div>
  )
}

export default PrivacyPage
