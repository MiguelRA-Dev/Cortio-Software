import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

function TermsPage() {
  return (
    <div className="min-h-screen bg-bg">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-6">
          <span className="text-xl font-semibold tracking-tight text-ink">Cortio Software</span>
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
            <p className="text-muted">
              Cortio Software gestiona esta plataforma. En estos Términos, "nosotros", "nos" y "nuestro" se refieren
              a Cortio Software. Ofrecemos esta plataforma, incluida toda la información, las herramientas y los
              servicios que ponemos a su disposición, siempre y cuando acepte la totalidad de los términos,
              condiciones, políticas y avisos aquí contemplados.
            </p>
            <p className="mt-2 text-muted">
              Al acceder a nuestra plataforma y/o usar nuestros servicios, usted interactúa con nuestro "Servicio" y
              acepta como vinculantes los siguientes términos y condiciones (denominados "Términos del servicio" o
              "Términos"), incluidos los términos adicionales y políticas mencionados aquí o disponibles por
              hipervínculo (como nuestra Política de privacidad). Estos Términos se aplican a todos los usuarios de
              la plataforma, incluyendo dueños de barbería, barberos y clientes que agendan citas.
            </p>
            <p className="mt-2 text-muted">
              Lea estos Términos detenidamente antes de acceder o utilizar la plataforma. Al acceder o utilizar
              cualquier parte del Servicio, usted acepta estos Términos. Si no acepta la totalidad, no podrá acceder
              ni utilizar el Servicio.
            </p>
            <p className="mt-2 text-muted">
              Las nuevas funciones o herramientas que agreguemos también estarán sujetas a estos Términos. Puede
              revisar la versión más reciente en cualquier momento en esta página. Nos reservamos el derecho de
              actualizar, cambiar o reemplazar cualquier parte de los presentes Términos mediante la publicación de
              actualizaciones en la plataforma. Su uso continuado después de la publicación de cualquier cambio
              constituye la aceptación de dichos cambios.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-ink">1. Términos de uso de la plataforma</h2>
            <p className="mt-2 text-muted">
              Al aceptar los presentes Términos, usted declara que tiene la mayoría de edad en su país o lugar de
              residencia, o que cuenta con el consentimiento de su padre, madre o tutor para usar la plataforma si es
              menor de edad.
            </p>
            <p className="mt-2 text-muted">
              No puede utilizar nuestros servicios para ningún fin ilegal o no autorizado, ni infringir, al hacer uso
              del Servicio, las leyes de su jurisdicción (incluyendo, de manera enunciativa mas no limitativa, las
              leyes de derechos de autor y de protección de datos personales).
            </p>
            <p className="mt-2 text-muted">
              No transmitirá ningún gusano, virus informático ni código de naturaleza destructiva.
            </p>
            <p className="mt-2 text-muted">
              El incumplimiento o violación de cualquiera de los Términos dará como resultado la rescisión inmediata
              de su acceso a los Servicios.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-ink">2. Condiciones generales</h2>
            <p className="mt-2 text-muted">
              Nos reservamos el derecho de rechazar el servicio a cualquier persona, por cualquier motivo, en
              cualquier momento.
            </p>
            <p className="mt-2 text-muted">
              Usted comprende que la información que registra en la plataforma (sin incluir los datos completos de su
              tarjeta de crédito, que son procesados directamente por nuestra pasarela de pagos) puede transferirse a
              través de varias redes y adaptarse a los requisitos técnicos de conexión de redes o dispositivos.
            </p>
            <p className="mt-2 text-muted">
              Usted acepta no reproducir, duplicar, copiar, vender, revender ni aprovechar ninguna parte del
              Servicio, ni el acceso al mismo, sin nuestro permiso expreso por escrito.
            </p>
            <p className="mt-2 text-muted">
              Los encabezados utilizados en este acuerdo se incluyen solo para facilitar la lectura y no limitarán ni
              afectarán los presentes Términos.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-ink">3. Exactitud, totalidad y cronología de la información</h2>
            <p className="mt-2 text-muted">
              No nos responsabilizamos si la información disponible en la plataforma no es precisa, completa o
              actualizada. El material presentado se proporciona solo para información general y no debe utilizarse
              como la única base para tomar decisiones de negocio sin consultar fuentes adicionales. Al confiar en
              cualquier material de la plataforma, lo hace por su cuenta y riesgo.
            </p>
            <p className="mt-2 text-muted">
              La plataforma puede contener cierta información histórica (por ejemplo, reportes de citas o ventas
              pasadas), que se proporciona únicamente como referencia. Nos reservamos el derecho de modificar el
              contenido de la plataforma en cualquier momento, sin obligación de actualizar información previamente
              publicada.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-ink">4. Modificaciones al Servicio y precios</h2>
            <p className="mt-2 text-muted">
              Los precios de nuestros planes de suscripción están sujetos a cambios, los cuales le serán notificados
              con antelación razonable conforme a la ley aplicable.
            </p>
            <p className="mt-2 text-muted">
              Nos reservamos el derecho de modificar o discontinuar el Servicio (o cualquier parte o función del
              mismo) en cualquier momento. No seremos responsables ante usted ni ante ningún tercero por ninguna
              modificación, cambio de precio, suspensión o interrupción del Servicio.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-ink">5. El Servicio</h2>
            <p className="mt-2 text-muted">
              Cortio es una plataforma de software como servicio (SaaS) que permite a barberías gestionar citas,
              clientes, inventario, ventas, nómina y su suscripción, y que permite a los clientes de esas barberías
              agendar citas en línea.
            </p>
            <p className="mt-2 text-muted">
              Nos reservamos el derecho, pero no estamos obligados, de limitar el acceso a la plataforma a cualquier
              persona, región geográfica o jurisdicción. Todas las funciones y planes de suscripción están sujetos a
              cambios en cualquier momento y sin previo aviso, a nuestra entera discreción. Nos reservamos el derecho
              de discontinuar cualquier función en cualquier momento.
            </p>
            <p className="mt-2 text-muted">
              No garantizamos que la plataforma cumplirá con todas sus expectativas particulares, o que cualquier
              error se corregirá de inmediato.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-ink">6. Exactitud de la facturación y de la información de la cuenta</h2>
            <p className="mt-2 text-muted">
              Nos reservamos el derecho de rechazar o cancelar cualquier suscripción. Podemos, a nuestro exclusivo
              criterio, limitar o cancelar suscripciones asociadas a la misma cuenta, el mismo método de pago, o que
              muestren indicios de uso fraudulento.
            </p>
            <p className="mt-2 text-muted">
              Usted acepta suministrar información completa y precisa de su cuenta y método de pago, y acepta
              actualizar rápidamente esta información —entre ellas su dirección de correo electrónico y los datos de
              su tarjeta— para que podamos completar sus transacciones y contactarlo según sea necesario.
            </p>
            <p className="mt-2 text-muted">
              Los pagos ya procesados no son reembolsables, salvo que la ley disponga lo contrario.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-ink">7. Herramientas de terceros</h2>
            <p className="mt-2 text-muted">
              Podemos proporcionarle acceso a herramientas de terceros que no supervisamos ni controlamos (por
              ejemplo, procesadores de pago, servicios de correo electrónico o de inicio de sesión). Usted reconoce y
              acepta que brindamos acceso a dichas herramientas "tal como se encuentran" y "según disponibilidad" sin
              garantías de ningún tipo. No tendremos ninguna responsabilidad como consecuencia del uso que haga de
              herramientas de terceros integradas en la plataforma.
            </p>
            <p className="mt-2 text-muted">
              También podemos, en el futuro, ofrecer nuevas funciones a través de la plataforma. Estas nuevas
              funciones también estarán sujetas a los presentes Términos.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-ink">8. Enlaces de terceros</h2>
            <p className="mt-2 text-muted">
              Algunos contenidos o funciones disponibles a través de nuestro Servicio pueden incluir enlaces o
              recursos de terceros. No somos responsables de examinar o evaluar el contenido de sitios web de
              terceros, ni garantizamos ni asumiremos ninguna obligación por ellos.
            </p>
            <p className="mt-2 text-muted">
              No somos responsables de ningún daño o perjuicio relacionado con el uso de servicios de terceros
              vinculados desde la plataforma. Revise cuidadosamente las políticas de terceros antes de interactuar
              con ellos.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-ink">9. Comentarios y reseñas de los usuarios</h2>
            <p className="mt-2 text-muted">
              Si usted envía comentarios, ideas, sugerencias u otros materiales relacionados con la plataforma
              (denominados en conjunto "comentarios"), acepta que podamos, en cualquier momento y sin restricción,
              usarlos para mejorar el Servicio. No tenemos obligación de mantener ningún comentario de manera
              confidencial, ni de pagar compensación por él.
            </p>
            <p className="mt-2 text-muted">
              Si la plataforma le permite dejar reseñas sobre una barbería, usted acepta que dichas reseñas serán
              visibles públicamente en el perfil de esa barbería, y que son responsabilidad exclusiva de quien las
              escribe. Podemos, sin obligación de hacerlo, monitorear o eliminar reseñas que a nuestra entera
              discreción determinemos que son ilegales, ofensivas o difamatorias.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-ink">10. Información personal</h2>
            <p className="mt-2 text-muted">
              El tratamiento de la información personal que usted comparta a través de la plataforma se rige por
              nuestra{' '}
              <Link to="/privacy" className="text-ink underline underline-offset-2">
                Política de privacidad
              </Link>
              .
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-ink">11. Errores e inexactitudes</h2>
            <p className="mt-2 text-muted">
              Puede haber información en la plataforma que, ocasionalmente, contenga errores tipográficos,
              inexactitudes u omisiones relacionadas con descripciones de planes, precios o disponibilidad de
              funciones. Nos reservamos el derecho de corregir dichos errores en cualquier momento sin previo aviso.
            </p>
            <p className="mt-2 text-muted">
              No asumimos ninguna obligación de actualizar, modificar o aclarar la información en la plataforma,
              excepto cuando lo exija la ley.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-ink">12. Usos prohibidos</h2>
            <p className="mt-2 text-muted">
              Además de las prohibiciones establecidas en estos Términos, se le prohíbe utilizar la plataforma o su
              contenido para: (a) cualquier propósito ilegal; (b) solicitar a otros que realicen actos ilegales; (c)
              infringir cualquier ley o reglamento aplicable; (d) infringir nuestros derechos de propiedad intelectual
              o los de terceros; (e) acosar, abusar, difamar, intimidar o discriminar por motivos de género,
              orientación sexual, religión, etnia, raza, edad, nacionalidad o discapacidad; (f) enviar información
              falsa o engañosa; (g) cargar o transmitir virus o código dañino; (h) recopilar o rastrear la
              información personal de otros usuarios sin autorización; (i) enviar correo no deseado o phishing; o (j)
              interferir o eludir las funciones de seguridad de la plataforma. Nos reservamos el derecho de dar por
              terminado su acceso al Servicio por infringir cualquiera de estos usos prohibidos.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-ink">13. Descargo de garantías; limitación de responsabilidad</h2>
            <p className="mt-2 text-muted">
              No garantizamos, representamos ni aseguramos que el uso que haga de la plataforma será ininterrumpido,
              oportuno, seguro o libre de errores, ni que los resultados obtenidos sean exactos o confiables.
            </p>
            <p className="mt-2 text-muted">
              Usted acepta que podamos, periódicamente, suspender el Servicio por lapsos indefinidos, o cancelarlo,
              notificándole conforme a lo dispuesto en estos Términos.
            </p>
            <p className="mt-2 text-muted">
              El Servicio se ofrece "tal como está" y "según disponibilidad", sin ninguna garantía de ningún tipo,
              expresa o implícita.
            </p>
            <p className="mt-2 text-muted">
              En ningún caso Cortio Software, sus directores, funcionarios, empleados, afiliados, agentes,
              contratistas o proveedores de servicios serán responsables de ninguna pérdida, reclamo o daño directo,
              indirecto, incidental, punitivo, especial o consecuente de cualquier tipo (incluyendo pérdida de
              beneficios, ingresos, ahorros o datos) que surja del uso que haga de la plataforma o de cualquier
              contenido publicado a través de ella, incluso si se ha informado de la posibilidad de tales daños.
            </p>
            <p className="mt-2 text-muted">
              Debido a que algunas jurisdicciones no permiten la exclusión o limitación de responsabilidad por daños
              incidentales o consecuentes, en dichas jurisdicciones nuestra responsabilidad se limitará a la
              extensión máxima permitida por la ley.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-ink">14. Indemnización</h2>
            <p className="mt-2 text-muted">
              Usted acepta indemnizar, defender y mantener indemne a Cortio Software y a nuestros funcionarios,
              directores, agentes, contratistas, licenciantes, proveedores de servicios, subcontratistas y empleados,
              de cualquier reclamo o demanda, incluidos honorarios razonables de abogados, que surja de su
              incumplimiento de estos Términos o de la violación de cualquier ley o derecho de un tercero.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-ink">15. Divisibilidad</h2>
            <p className="mt-2 text-muted">
              En caso de que se determine que alguna disposición de los presentes Términos sea ilegal, nula o
              inaplicable, dicha disposición se ejecutará en la medida en que lo permita la ley aplicable, y la parte
              inaplicable se considerará separada de estos Términos, sin afectar la validez de las demás
              disposiciones.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-ink">16. Rescisión</h2>
            <p className="mt-2 text-muted">
              Estos Términos se encuentran vigentes hasta que usted o nosotros los rescindamos. Puede eliminar su
              cuenta en cualquier momento desde la Configuración de la plataforma, conforme al proceso de eliminación
              de cuenta descrito ahí (con un período de gracia antes de la eliminación definitiva de los datos).
            </p>
            <p className="mt-2 text-muted">
              Si a nuestro juicio usted incumple, o sospechamos que ha incumplido, cualquier disposición de estos
              Términos, podemos suspender o rescindir su acceso al Servicio en cualquier momento, y usted seguirá
              siendo responsable de todos los importes adeudados hasta la fecha de rescisión.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-ink">17. Acuerdo completo</h2>
            <p className="mt-2 text-muted">
              El hecho de que no ejerzamos algún derecho o disposición de estos Términos no constituirá una renuncia
              a dicho derecho.
            </p>
            <p className="mt-2 text-muted">
              Estos Términos, junto con nuestra Política de privacidad y cualquier otra política publicada en la
              plataforma, constituyen el acuerdo completo entre usted y nosotros, y sustituyen cualquier acuerdo o
              comunicación anterior, oral o escrita.
            </p>
            <p className="mt-2 text-muted">
              Cualquier ambigüedad en la interpretación de estos Términos no se interpretará en contra de la parte
              redactora.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-ink">18. Ley aplicable</h2>
            <p className="mt-2 text-muted">
              Los presentes Términos y cualquier acuerdo por separado mediante el cual le proporcionemos Servicios se
              regirán e interpretarán de acuerdo con las leyes de Colombia, con domicilio en Calle 151#109A-50,
              Bogotá D.C.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-ink">19. Cambios en los Términos del servicio</h2>
            <p className="mt-2 text-muted">
              Puede revisar la versión más reciente de estos Términos en cualquier momento en esta página. Nos
              reservamos el derecho de actualizar, cambiar o sustituir cualquier parte de los presentes Términos
              mediante la publicación de cambios en la plataforma. Su uso continuado del Servicio después de la
              publicación de cualquier cambio constituye la aceptación de dichos cambios.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-ink">20. Información de contacto</h2>
            <p className="mt-2 text-muted">
              Las preguntas sobre estos Términos del servicio se deben enviar a{' '}
              <a href="mailto:angel4pride@gmail.com" className="text-ink underline underline-offset-2">
                angel4pride@gmail.com
              </a>
              .
            </p>
          </section>
        </div>
      </main>
    </div>
  )
}

export default TermsPage
