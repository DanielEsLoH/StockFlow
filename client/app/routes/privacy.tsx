import { Link } from "react-router";
import { StockFlowLogo } from "~/components/ui/StockFlowLogo";
import { ThemeToggle } from "~/components/ui/ThemeToggle";

const SITE_URL = "https://www.stockflow.com.co";
const TITLE = "Política de Privacidad - StockFlow";
const DESCRIPTION =
  "Política de privacidad y protección de datos personales de StockFlow. Cumplimiento con Ley 1581 de 2012 y GDPR.";

export function meta() {
  return [
    { title: TITLE },
    { name: "description", content: DESCRIPTION },
    { tagName: "link", rel: "canonical", href: `${SITE_URL}/privacy` },
    { property: "og:type", content: "website" },
    { property: "og:url", content: `${SITE_URL}/privacy` },
    { property: "og:title", content: TITLE },
    { property: "og:description", content: DESCRIPTION },
    { property: "og:locale", content: "es_CO" },
    { property: "og:site_name", content: "StockFlow" },
    { name: "robots", content: "index, follow" },
  ];
}

// ---------------------------------------------------------------------------
// Table of Contents
// ---------------------------------------------------------------------------

const sections = [
  { id: "introduccion", label: "1. Introducción" },
  { id: "responsable", label: "2. Responsable del tratamiento" },
  { id: "datos-recopilados", label: "3. Datos que recopilamos" },
  { id: "uso-datos", label: "4. Cómo usamos sus datos" },
  { id: "whatsapp", label: "5. Datos de WhatsApp Business" },
  { id: "compartir-datos", label: "6. Compartición de datos" },
  { id: "retencion", label: "7. Retención de datos" },
  { id: "eliminacion", label: "8. Eliminación de datos" },
  { id: "derechos", label: "9. Derechos del titular" },
  { id: "cookies", label: "10. Cookies y tecnologías similares" },
  { id: "seguridad", label: "11. Seguridad" },
  { id: "internacional", label: "12. Transferencias internacionales" },
  { id: "menores", label: "13. Menores de edad" },
  { id: "cambios", label: "14. Cambios a esta política" },
  { id: "contacto", label: "15. Contacto" },
];

// ---------------------------------------------------------------------------
// Components
// ---------------------------------------------------------------------------

function PolicyHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-neutral-200 bg-white/80 backdrop-blur-lg dark:border-neutral-800 dark:bg-neutral-950/80">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
        <Link to="/" aria-label="StockFlow">
          <StockFlowLogo size="sm" showText />
        </Link>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Link
            to="/login"
            className="rounded-lg bg-primary-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-600"
          >
            Iniciar sesión
          </Link>
        </div>
      </div>
    </header>
  );
}

function TableOfContents() {
  return (
    <nav className="rounded-xl border border-neutral-200 bg-neutral-50 p-6 dark:border-neutral-800 dark:bg-neutral-900">
      <h2 className="font-display text-sm font-semibold tracking-wide text-neutral-900 uppercase dark:text-white">
        Contenido
      </h2>
      <ol className="mt-4 space-y-1.5">
        {sections.map((s) => (
          <li key={s.id}>
            <a
              href={`#${s.id}`}
              className="block text-sm text-neutral-500 transition-colors hover:text-primary-600 dark:text-neutral-400 dark:hover:text-primary-400"
            >
              {s.label}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24">
      <h2 className="font-display text-xl font-bold tracking-tight text-neutral-900 sm:text-2xl dark:text-white">
        {title}
      </h2>
      <div className="mt-4 space-y-4 text-[0.938rem] leading-relaxed text-neutral-600 dark:text-neutral-400">
        {children}
      </div>
    </section>
  );
}

function PolicyFooter() {
  return (
    <footer className="border-t border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-4 px-4 py-8 sm:flex-row sm:justify-between sm:px-6">
        <p className="text-sm text-neutral-400 dark:text-neutral-500">
          &copy; 2026 StockFlow. Todos los derechos reservados.
        </p>
        <div className="flex gap-6 text-sm text-neutral-400 dark:text-neutral-500">
          <Link
            to="/"
            className="transition-colors hover:text-neutral-600 dark:hover:text-neutral-300"
          >
            Inicio
          </Link>
          <Link
            to="/privacy"
            className="text-primary-500 dark:text-primary-400"
          >
            Privacidad
          </Link>
        </div>
      </div>
    </footer>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-white dark:bg-neutral-950">
      <PolicyHeader />

      {/* Hero */}
      <div className="border-b border-neutral-200 bg-gradient-to-b from-primary-50/40 to-white dark:border-neutral-800 dark:from-primary-950/20 dark:to-neutral-950">
        <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 sm:py-20">
          <p className="text-sm font-medium tracking-wide text-primary-600 uppercase dark:text-primary-400">
            Documento legal
          </p>
          <h1 className="font-display mt-2 text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl dark:text-white">
            Política de Privacidad y Protección de Datos Personales
          </h1>
          <p className="mt-4 max-w-2xl text-base text-neutral-500 dark:text-neutral-400">
            En StockFlow nos comprometemos con la protección de sus datos
            personales. Esta política describe cómo recopilamos, usamos,
            almacenamos y protegemos su información al utilizar nuestras
            aplicaciones y servicios.
          </p>
          <p className="mt-6 text-sm text-neutral-400 dark:text-neutral-500">
            Última actualización:{" "}
            <time dateTime="2026-03-25" className="font-medium text-neutral-600 dark:text-neutral-300">
              25 de marzo de 2026
            </time>
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:py-16">
        <div className="grid gap-12 lg:grid-cols-[260px_1fr]">
          {/* Sidebar TOC — sticky on desktop */}
          <aside className="hidden lg:block">
            <div className="sticky top-20">
              <TableOfContents />
            </div>
          </aside>

          {/* Mobile TOC */}
          <div className="lg:hidden">
            <TableOfContents />
          </div>

          {/* Sections */}
          <div className="space-y-12">
            <Section id="introduccion" title="1. Introducción">
              <p>
                StockFlow (&quot;nosotros&quot;, &quot;nuestro&quot; o &quot;la
                Plataforma&quot;) es una plataforma de software como servicio
                (SaaS) para la gestión de inventario, facturación electrónica,
                contabilidad y administración empresarial. Operamos el sitio web{" "}
                <a
                  href="https://stockflow.com.co"
                  className="text-primary-600 underline underline-offset-2 dark:text-primary-400"
                >
                  stockflow.com.co
                </a>{" "}
                y las aplicaciones móviles y de escritorio asociadas
                (colectivamente, los &quot;Servicios&quot;).
              </p>
              <p>
                Esta Política de Privacidad describe cómo recopilamos, usamos,
                compartimos y protegemos los datos personales que usted nos
                proporciona al registrarse, acceder o utilizar cualquiera de
                nuestros Servicios, incluyendo la comunicación a través de
                canales como WhatsApp Business.
              </p>
              <p>
                Al utilizar nuestros Servicios, usted acepta las prácticas
                descritas en esta política. Si no está de acuerdo con alguna de
                estas prácticas, le solicitamos que no utilice nuestros
                Servicios.
              </p>
            </Section>

            <Section id="responsable" title="2. Responsable del tratamiento">
              <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-5 dark:border-neutral-800 dark:bg-neutral-900">
                <dl className="space-y-3 text-sm">
                  <div>
                    <dt className="font-medium text-neutral-900 dark:text-white">
                      Razón social
                    </dt>
                    <dd>StockFlow S.A.S.</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-neutral-900 dark:text-white">
                      País
                    </dt>
                    <dd>Colombia</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-neutral-900 dark:text-white">
                      Correo electrónico
                    </dt>
                    <dd>
                      <a
                        href="mailto:contacto@stockflow.com.co"
                        className="text-primary-600 underline underline-offset-2 dark:text-primary-400"
                      >
                        contacto@stockflow.com.co
                      </a>
                    </dd>
                  </div>
                  <div>
                    <dt className="font-medium text-neutral-900 dark:text-white">
                      Sitio web
                    </dt>
                    <dd>
                      <a
                        href="https://stockflow.com.co"
                        className="text-primary-600 underline underline-offset-2 dark:text-primary-400"
                      >
                        https://stockflow.com.co
                      </a>
                    </dd>
                  </div>
                </dl>
              </div>
              <p>
                StockFlow actúa como Responsable del Tratamiento de datos
                personales en los términos de la Ley 1581 de 2012 y el Decreto
                1074 de 2015 de la República de Colombia.
              </p>
            </Section>

            <Section id="datos-recopilados" title="3. Datos que recopilamos">
              <p>
                Recopilamos diferentes tipos de información dependiendo de cómo
                interactúa con nuestros Servicios:
              </p>

              <h3 className="mt-6 font-display text-base font-semibold text-neutral-900 dark:text-white">
                3.1 Datos proporcionados directamente por usted
              </h3>
              <ul className="mt-2 list-inside list-disc space-y-1.5 pl-1">
                <li>
                  <strong>Información de registro:</strong> nombre completo,
                  correo electrónico, número de teléfono, contraseña, nombre de
                  la empresa, NIT o documento de identidad.
                </li>
                <li>
                  <strong>Información de perfil empresarial:</strong> dirección
                  comercial, logotipo, información tributaria, régimen fiscal,
                  datos de resolución DIAN.
                </li>
                <li>
                  <strong>Datos transaccionales:</strong> productos, inventarios,
                  facturas, cotizaciones, órdenes de compra, pagos, gastos y
                  asientos contables que usted registra en la plataforma.
                </li>
                <li>
                  <strong>Información de contacto de terceros:</strong> datos de
                  clientes, proveedores y empleados que usted ingresa para la
                  gestión de su negocio.
                </li>
              </ul>

              <h3 className="mt-6 font-display text-base font-semibold text-neutral-900 dark:text-white">
                3.2 Datos recopilados automáticamente
              </h3>
              <ul className="mt-2 list-inside list-disc space-y-1.5 pl-1">
                <li>
                  <strong>Datos del dispositivo:</strong> tipo de navegador,
                  sistema operativo, dirección IP, identificador del
                  dispositivo.
                </li>
                <li>
                  <strong>Datos de uso:</strong> páginas visitadas, funciones
                  utilizadas, horarios de acceso, duración de sesión.
                </li>
                <li>
                  <strong>Datos de ubicación general:</strong> país y ciudad
                  inferidos de la dirección IP (no geolocalización precisa).
                </li>
              </ul>

              <h3 className="mt-6 font-display text-base font-semibold text-neutral-900 dark:text-white">
                3.3 Datos de terceros
              </h3>
              <ul className="mt-2 list-inside list-disc space-y-1.5 pl-1">
                <li>
                  <strong>Proveedores de autenticación:</strong> si inicia sesión
                  con Google o GitHub, recibimos su nombre, correo electrónico y
                  foto de perfil.
                </li>
                <li>
                  <strong>Pasarelas de pago:</strong> Stripe y Wompi nos
                  proporcionan confirmaciones de transacción (no almacenamos
                  números completos de tarjeta de crédito).
                </li>
              </ul>
            </Section>

            <Section id="uso-datos" title="4. Cómo usamos sus datos">
              <p>
                Utilizamos sus datos personales para las siguientes finalidades:
              </p>
              <ul className="mt-2 list-inside list-disc space-y-1.5 pl-1">
                <li>
                  <strong>Provisión del servicio:</strong> crear y administrar su
                  cuenta, procesar transacciones, generar facturas electrónicas,
                  gestionar inventarios y ejecutar las funcionalidades de la
                  plataforma.
                </li>
                <li>
                  <strong>Comunicación:</strong> enviarle notificaciones sobre su
                  cuenta, alertas de inventario, recordatorios de cobranza,
                  actualizaciones del servicio y responder a sus consultas.
                </li>
                <li>
                  <strong>Cumplimiento normativo:</strong> generar documentos
                  electrónicos válidos ante la DIAN, calcular impuestos, generar
                  reportes contables y cumplir con obligaciones legales y
                  tributarias colombianas.
                </li>
                <li>
                  <strong>Mejora del servicio:</strong> analizar patrones de uso
                  para mejorar funcionalidades, rendimiento y experiencia de
                  usuario.
                </li>
                <li>
                  <strong>Seguridad:</strong> detectar y prevenir fraudes, accesos
                  no autorizados y actividades sospechosas.
                </li>
                <li>
                  <strong>Soporte al cliente:</strong> atender sus solicitudes de
                  asistencia técnica a través de los canales disponibles,
                  incluyendo WhatsApp.
                </li>
              </ul>
            </Section>

            <Section id="whatsapp" title="5. Datos de WhatsApp Business">
              <div className="rounded-lg border border-primary-200 bg-primary-50 p-5 dark:border-primary-800/40 dark:bg-primary-950/30">
                <p className="text-sm font-medium text-primary-800 dark:text-primary-300">
                  StockFlow utiliza la API de WhatsApp Business de Meta para
                  comunicarse con usted y brindarle soporte a través de
                  WhatsApp.
                </p>
              </div>

              <h3 className="mt-6 font-display text-base font-semibold text-neutral-900 dark:text-white">
                5.1 Datos que recopilamos a través de WhatsApp
              </h3>
              <ul className="mt-2 list-inside list-disc space-y-1.5 pl-1">
                <li>
                  Su número de teléfono de WhatsApp y nombre de perfil.
                </li>
                <li>
                  El contenido de los mensajes que usted nos envía (texto,
                  imágenes, documentos).
                </li>
                <li>
                  Metadatos de la conversación (fecha, hora, estado de entrega
                  del mensaje).
                </li>
              </ul>

              <h3 className="mt-6 font-display text-base font-semibold text-neutral-900 dark:text-white">
                5.2 Cómo usamos los datos de WhatsApp
              </h3>
              <ul className="mt-2 list-inside list-disc space-y-1.5 pl-1">
                <li>
                  Responder a sus consultas de soporte técnico y atención al
                  cliente.
                </li>
                <li>
                  Enviarle notificaciones transaccionales relacionadas con su
                  cuenta (alertas de inventario, confirmaciones de pedido,
                  recordatorios de pago), siempre que usted haya otorgado su
                  consentimiento previo y explícito (opt-in).
                </li>
                <li>
                  Mejorar la calidad de nuestro servicio de atención al cliente.
                </li>
              </ul>

              <h3 className="mt-6 font-display text-base font-semibold text-neutral-900 dark:text-white">
                5.3 Consentimiento y opt-out
              </h3>
              <p>
                Solo le enviaremos mensajes por WhatsApp si usted ha otorgado su
                consentimiento explícito previamente. Puede revocar este
                consentimiento en cualquier momento enviando la palabra
                &quot;STOP&quot; al número de WhatsApp de StockFlow o
                contactándonos a{" "}
                <a
                  href="mailto:contacto@stockflow.com.co"
                  className="text-primary-600 underline underline-offset-2 dark:text-primary-400"
                >
                  contacto@stockflow.com.co
                </a>
                .
              </p>

              <h3 className="mt-6 font-display text-base font-semibold text-neutral-900 dark:text-white">
                5.4 Uso de chatbots
              </h3>
              <p>
                StockFlow puede utilizar asistentes automatizados (chatbots) para
                brindarle respuestas rápidas a consultas frecuentes. En caso de
                que sea necesaria atención humana, su conversación será derivada
                a un agente de soporte. Le informaremos siempre que esté
                interactuando con un sistema automatizado.
              </p>
            </Section>

            <Section id="compartir-datos" title="6. Compartición de datos">
              <p>
                No vendemos sus datos personales. Podemos compartir información
                con terceros únicamente en las siguientes circunstancias:
              </p>
              <ul className="mt-2 list-inside list-disc space-y-1.5 pl-1">
                <li>
                  <strong>Proveedores de servicios:</strong> empresas que nos
                  ayudan a operar la plataforma (alojamiento en la nube,
                  procesamiento de pagos, envío de correos electrónicos,
                  servicios de mensajería como WhatsApp/Meta).
                </li>
                <li>
                  <strong>Autoridades competentes:</strong> cuando la ley lo
                  exija, como la DIAN para facturación electrónica, o por orden
                  judicial.
                </li>
                <li>
                  <strong>Con su consentimiento:</strong> en cualquier otro caso,
                  solicitaremos su autorización previa.
                </li>
              </ul>
              <p>
                Todos nuestros proveedores están vinculados por acuerdos de
                confidencialidad y tratamiento de datos que garantizan un nivel
                de protección equivalente al establecido en esta política.
              </p>
            </Section>

            <Section id="retencion" title="7. Retención de datos">
              <p>
                Conservamos sus datos personales durante el tiempo que sea
                necesario para cumplir con los fines descritos en esta política,
                sus obligaciones contractuales y los requerimientos legales
                aplicables:
              </p>
              <ul className="mt-2 list-inside list-disc space-y-1.5 pl-1">
                <li>
                  <strong>Datos de cuenta:</strong> mientras su cuenta esté
                  activa, más 30 días adicionales tras la cancelación.
                </li>
                <li>
                  <strong>Datos contables y tributarios:</strong> mínimo 5 años
                  conforme a la legislación tributaria colombiana (artículo 632
                  del Estatuto Tributario).
                </li>
                <li>
                  <strong>Facturas electrónicas:</strong> mínimo 5 años según
                  Resolución DIAN 000042 de 2020.
                </li>
                <li>
                  <strong>Conversaciones de WhatsApp:</strong> máximo 90 días
                  para fines de soporte, a menos que se requieran por un período
                  mayor por obligación legal.
                </li>
                <li>
                  <strong>Registros de auditoría:</strong> 2 años para
                  trazabilidad y seguridad.
                </li>
              </ul>
            </Section>

            <Section id="eliminacion" title="8. Eliminación de datos">
              <div className="rounded-lg border border-success-200 bg-success-50 p-5 dark:border-success-800/40 dark:bg-success-950/30">
                <p className="text-sm font-medium text-success-800 dark:text-success-300">
                  Usted tiene derecho a solicitar la eliminación de sus datos
                  personales en cualquier momento.
                </p>
              </div>

              <p className="mt-4">
                Para solicitar la eliminación de sus datos, puede utilizar
                cualquiera de los siguientes canales:
              </p>
              <ul className="mt-2 list-inside list-disc space-y-1.5 pl-1">
                <li>
                  <strong>Autoservicio:</strong> desde su panel de configuración
                  en StockFlow, sección &quot;Mi cuenta&quot; → &quot;Eliminar
                  cuenta&quot;.
                </li>
                <li>
                  <strong>Correo electrónico:</strong> envíe su solicitud a{" "}
                  <a
                    href="mailto:contacto@stockflow.com.co"
                    className="text-primary-600 underline underline-offset-2 dark:text-primary-400"
                  >
                    contacto@stockflow.com.co
                  </a>{" "}
                  con el asunto &quot;Solicitud de eliminación de datos&quot;.
                </li>
                <li>
                  <strong>WhatsApp:</strong> envíe &quot;ELIMINAR MIS
                  DATOS&quot; a nuestro número de WhatsApp Business.
                </li>
              </ul>
              <p>
                Procesaremos su solicitud dentro de los 15 días hábiles
                siguientes, conforme a lo establecido en la Ley 1581 de 2012.
                Algunos datos podrán ser retenidos cuando exista una obligación
                legal para ello (por ejemplo, registros tributarios).
              </p>
            </Section>

            <Section id="derechos" title="9. Derechos del titular">
              <p>
                De acuerdo con la Ley 1581 de 2012 (Ley de Protección de Datos
                Personales de Colombia) y el Reglamento General de Protección de
                Datos (GDPR) de la Unión Europea para usuarios internacionales,
                usted tiene los siguientes derechos:
              </p>
              <ul className="mt-2 list-inside list-disc space-y-1.5 pl-1">
                <li>
                  <strong>Acceso:</strong> conocer qué datos personales tenemos
                  sobre usted.
                </li>
                <li>
                  <strong>Rectificación:</strong> solicitar la corrección de
                  datos inexactos o incompletos.
                </li>
                <li>
                  <strong>Supresión:</strong> solicitar la eliminación de sus
                  datos cuando ya no sean necesarios.
                </li>
                <li>
                  <strong>Revocación del consentimiento:</strong> retirar su
                  autorización para el tratamiento de datos en cualquier momento.
                </li>
                <li>
                  <strong>Portabilidad:</strong> recibir sus datos en un formato
                  estructurado y legible por máquina (CSV o Excel).
                </li>
                <li>
                  <strong>Oposición:</strong> oponerse al tratamiento de sus
                  datos para fines específicos.
                </li>
                <li>
                  <strong>Presentar quejas:</strong> ante la Superintendencia de
                  Industria y Comercio (SIC) de Colombia como autoridad de
                  protección de datos.
                </li>
              </ul>
              <p>
                Para ejercer cualquiera de estos derechos, contáctenos a{" "}
                <a
                  href="mailto:contacto@stockflow.com.co"
                  className="text-primary-600 underline underline-offset-2 dark:text-primary-400"
                >
                  contacto@stockflow.com.co
                </a>
                . Responderemos dentro de los 15 días hábiles establecidos por
                ley.
              </p>
            </Section>

            <Section id="cookies" title="10. Cookies y tecnologías similares">
              <p>Utilizamos las siguientes tecnologías de seguimiento:</p>
              <ul className="mt-2 list-inside list-disc space-y-1.5 pl-1">
                <li>
                  <strong>Cookies esenciales:</strong> necesarias para el
                  funcionamiento de la plataforma (sesión, autenticación,
                  preferencias de idioma y tema).
                </li>
                <li>
                  <strong>Cookies analíticas:</strong> nos ayudan a entender cómo
                  usted usa la plataforma para mejorar su experiencia. Estos
                  datos se anonimizan y agregan.
                </li>
                <li>
                  <strong>Almacenamiento local (localStorage):</strong> para
                  mantener su sesión activa y guardar preferencias de interfaz.
                </li>
              </ul>
              <p>
                Puede configurar su navegador para rechazar cookies o eliminar
                las existentes. Tenga en cuenta que deshabilitar cookies
                esenciales puede afectar el funcionamiento de la plataforma.
              </p>
            </Section>

            <Section id="seguridad" title="11. Seguridad">
              <p>
                Implementamos medidas técnicas y organizativas para proteger sus
                datos personales:
              </p>
              <ul className="mt-2 list-inside list-disc space-y-1.5 pl-1">
                <li>
                  Cifrado de datos en tránsito (TLS/SSL) y en reposo.
                </li>
                <li>
                  Autenticación con tokens JWT y contraseñas hasheadas con
                  bcrypt.
                </li>
                <li>
                  Control de acceso basado en roles (RBAC) con permisos
                  granulares.
                </li>
                <li>
                  Aislamiento de datos multi-tenant para garantizar que cada
                  empresa acceda únicamente a sus propios datos.
                </li>
                <li>
                  Registros de auditoría para trazabilidad de acciones
                  sensibles.
                </li>
                <li>
                  Infraestructura alojada en proveedores certificados con
                  estándares ISO 27001.
                </li>
              </ul>
            </Section>

            <Section
              id="internacional"
              title="12. Transferencias internacionales"
            >
              <p>
                Sus datos pueden ser procesados en servidores ubicados fuera de
                Colombia. Cuando esto ocurra, nos aseguramos de que el país
                receptor cuente con niveles adecuados de protección de datos o
                que existan garantías contractuales apropiadas (cláusulas
                contractuales tipo aprobadas por la SIC o equivalentes).
              </p>
              <p>
                Para usuarios de la Unión Europea y el Espacio Económico
                Europeo, las transferencias se realizan bajo las Cláusulas
                Contractuales Tipo de la Comisión Europea conforme al GDPR.
              </p>
            </Section>

            <Section id="menores" title="13. Menores de edad">
              <p>
                Nuestros Servicios no están dirigidos a menores de 18 años. No
                recopilamos intencionalmente datos personales de menores. Si
                detectamos que hemos recopilado datos de un menor, procederemos
                a eliminarlos de inmediato.
              </p>
            </Section>

            <Section id="cambios" title="14. Cambios a esta política">
              <p>
                Podemos actualizar esta Política de Privacidad periódicamente.
                Cuando realicemos cambios sustanciales, le notificaremos
                mediante:
              </p>
              <ul className="mt-2 list-inside list-disc space-y-1.5 pl-1">
                <li>Un aviso destacado en la plataforma.</li>
                <li>Un correo electrónico a la dirección registrada en su cuenta.</li>
                <li>
                  Actualización de la fecha de &quot;Última actualización&quot;
                  al inicio de este documento.
                </li>
              </ul>
              <p>
                Le recomendamos revisar esta política periódicamente. El uso
                continuado de nuestros Servicios tras la publicación de cambios
                constituye su aceptación de los mismos.
              </p>
            </Section>

            <Section id="contacto" title="15. Contacto">
              <p>
                Si tiene preguntas, inquietudes o desea ejercer sus derechos
                relacionados con esta Política de Privacidad, puede contactarnos
                a través de:
              </p>
              <div className="mt-4 rounded-lg border border-neutral-200 bg-neutral-50 p-5 dark:border-neutral-800 dark:bg-neutral-900">
                <dl className="space-y-3 text-sm">
                  <div>
                    <dt className="font-medium text-neutral-900 dark:text-white">
                      Correo electrónico
                    </dt>
                    <dd>
                      <a
                        href="mailto:contacto@stockflow.com.co"
                        className="text-primary-600 underline underline-offset-2 dark:text-primary-400"
                      >
                        contacto@stockflow.com.co
                      </a>
                    </dd>
                  </div>
                  <div>
                    <dt className="font-medium text-neutral-900 dark:text-white">
                      WhatsApp
                    </dt>
                    <dd>
                      <a
                        href="https://wa.me/573108563748"
                        className="text-primary-600 underline underline-offset-2 dark:text-primary-400"
                      >
                        +57 310 856 3748
                      </a>
                    </dd>
                  </div>
                  <div>
                    <dt className="font-medium text-neutral-900 dark:text-white">
                      Sitio web
                    </dt>
                    <dd>
                      <a
                        href="https://stockflow.com.co"
                        className="text-primary-600 underline underline-offset-2 dark:text-primary-400"
                      >
                        stockflow.com.co
                      </a>
                    </dd>
                  </div>
                  <div>
                    <dt className="font-medium text-neutral-900 dark:text-white">
                      Autoridad de protección de datos
                    </dt>
                    <dd>
                      Superintendencia de Industria y Comercio (SIC) —{" "}
                      <a
                        href="https://www.sic.gov.co"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary-600 underline underline-offset-2 dark:text-primary-400"
                      >
                        www.sic.gov.co
                      </a>
                    </dd>
                  </div>
                </dl>
              </div>
            </Section>
          </div>
        </div>
      </div>

      <PolicyFooter />
    </div>
  );
}
