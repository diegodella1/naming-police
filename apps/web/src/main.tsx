import "@fontsource-variable/archivo";
import "@fontsource-variable/source-sans-3";
import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

type IconName = "arrow" | "check" | "download" | "folder" | "lock" | "menu" | "undo" | "x";

function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  const paths: Record<IconName, React.ReactNode> = {
    arrow: <><path d="M5 12h14"/><path d="m13 6 6 6-6 6"/></>,
    check: <path d="m5 12 4 4L19 6"/>,
    download: <><path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/></>,
    folder: <path d="M3 6h7l2 2h9v11H3z"/>,
    lock: <><rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></>,
    menu: <><path d="M4 7h16M4 12h16M4 17h16"/></>,
    undo: <><path d="M9 7 4 12l5 5"/><path d="M20 17a8 8 0 0 0-16-5"/></>,
    x: <path d="m6 6 12 12M18 6 6 18"/>,
  };
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}

const nav = [
  ["/how-it-works", "Cómo funciona"],
  ["/download", "Descargar"],
  ["/pricing", "Precios"],
  ["/privacy", "Privacidad"],
  ["/about", "About"],
] as const;

function Logo() {
  return <a className="logo" href="/" aria-label="Naming Police, inicio"><span>NP</span><strong>Naming<br/>Police</strong></a>;
}

function Header() {
  const [open, setOpen] = useState(false);
  return (
    <header className="site-header">
      <Logo />
      <button className="menu-button" aria-label={open ? "Cerrar menú" : "Abrir menú"} aria-expanded={open} onClick={() => setOpen(!open)}><Icon name={open ? "x" : "menu"} /></button>
      <nav className={open ? "open" : ""} aria-label="Navegación principal">
        {nav.map(([href, label]) => <a key={href} href={href}>{label}</a>)}
        <a className="nav-login" href="/login">Ingresar</a>
        <a className="button small" href="/download">Probar la beta <Icon name="arrow" size={17}/></a>
      </nav>
    </header>
  );
}

function Footer() {
  return (
    <footer>
      <div className="footer-brand"><Logo/><p>Archivos identificables.<br/>Sin abrirlos uno por uno.</p></div>
      <div><strong>Producto</strong><a href="/how-it-works">Cómo funciona</a><a href="/download">Descargar</a><a href="/pricing">Precios</a></div>
      <div><strong>Compañía</strong><a href="/about">About</a><a href="/privacy">Privacidad</a><a href="/terms">Términos</a></div>
      <div className="footer-note"><span>© 2026 Diego Dell’Agostino</span><span>Hecho en Argentina.</span></div>
    </footer>
  );
}

function RenameCard({ from, to, tag, delay = 0 }: { from: string; to: string; tag: string; delay?: number }) {
  return <div className="rename-card" style={{ "--delay": `${delay}ms` } as React.CSSProperties}><span className="case-tag">{tag}</span><div className="file-glyph"><Icon name="folder" size={28}/></div><div><s>{from}</s><i>→</i><strong>{to}</strong></div><span className="approved"><Icon name="check" size={15}/> listo</span></div>;
}

function Home() {
  return (
    <>
      <main>
        <section className="hero">
          <div className="hero-copy">
            <p className="eyebrow">RENOMBRADO INTELIGENTE · LOCAL-FIRST</p>
            <h1>Tus archivos, con <em>nombre y apellido.</em></h1>
            <p className="lede">Naming Police convierte <code>IMG_4828</code>, <code>Screenshot (12)</code> y <code>document.pdf</code> en nombres que podés entender sin abrir cada archivo.</p>
            <div className="hero-actions"><a className="button" href="/download">Probar la beta <Icon name="arrow"/></a><a className="text-link" href="/how-it-works">Ver cómo funciona <span>↓</span></a></div>
            <p className="platform-note">Para macOS y Windows · Empezá en modo sugerencias · Todo cambio se puede deshacer</p>
          </div>
          <div className="case-stack" aria-label="Ejemplos de archivos renombrados">
            <div className="stamp">CASO<br/><strong>RESUELTO</strong></div>
            <RenameCard tag="FOTO" from="IMG_4828.jpg" to="playa-atardecer-imbassai-2026-07-30.jpg" />
            <RenameCard tag="CAPTURA" from="Screenshot (12).png" to="stripe-error-pago-rechazado.png" delay={90}/>
            <RenameCard tag="PDF" from="scan00023.pdf" to="factura-adobe-2026-07-usd-54-99.pdf" delay={180}/>
          </div>
        </section>

        <section className="problem-strip">
          <p>Tu carpeta Descargas no debería ser una escena del crimen.</p>
          <div><s>final_final_v2.pdf</s><s>download (4).pdf</s><s>DSC_0091.jpg</s></div>
        </section>

        <section className="benefits section">
          <div className="section-intro"><p className="eyebrow">QUÉ HACE</p><h2>Observa. Entiende. Propone.<br/><em>Vos mantenés el control.</em></h2></div>
          <div className="benefit-grid">
            <article><span>01</span><Icon name="folder" size={30}/><h3>Vigila las carpetas que elegís</h3><p>Descargas, screenshots, facturas o fotos. Nada más entra en alcance.</p></article>
            <article><span>02</span><div className="mini-ai">AI</div><h3>Interpreta lo necesario</h3><p>Usa metadata, texto y una miniatura reducida cuando activás IA remota.</p></article>
            <article><span>03</span><Icon name="undo" size={30}/><h3>Revierte cada cambio</h3><p>Historial local y undo para recuperar el nombre anterior en segundos.</p></article>
          </div>
        </section>

        <section className="privacy-promise section">
          <div className="privacy-seal"><Icon name="lock" size={32}/><span>LOCAL<br/>FIRST</span></div>
          <div><p className="eyebrow">PRIVACIDAD SIN LETRA CHICA</p><h2>Tus archivos se quedan en tu computadora.</h2><p>El monitoreo, el nombre final, el renombrado y el historial ocurren localmente. Si activás IA remota, se envía solo una miniatura reducida o el texto mínimo necesario al proveedor que elegís. Nunca la ruta completa. Nunca el archivo para almacenarlo.</p><a className="text-link" href="/privacy">Leer el modelo de privacidad <Icon name="arrow" size={17}/></a></div>
        </section>

        <section className="final-cta">
          <span className="case-tag">BETA PRIVADA</span><h2>Dejá de abrir archivos<br/>para saber qué son.</h2><p>Probá Naming Police y convertí el desorden diario en nombres útiles.</p><a className="button light" href="/download">Ver disponibilidad <Icon name="download"/></a>
        </section>
      </main>
    </>
  );
}

const steps = [
  ["01", "Elegí una carpeta", "Seleccioná Descargas, Screenshots, Facturas o una carpeta propia. Naming Police solo observa lo que autorizás."],
  ["02", "Elegí una regla", "Usá un preset listo o definí idioma y formato. El nombre final siempre se construye y valida localmente."],
  ["03", "Revisá sugerencias", "Modo Ask propone sin tocar archivos. Aceptá, editá o ignorá cada nombre desde una sola bandeja."],
  ["04", "Ganale confianza", "Cuando estés conforme, activá automático por carpeta. Historial y undo siguen disponibles."],
] as const;

type ReleasePlatform = {
  label: string;
  arch: string;
  min_os: string;
  url: string;
  sha256: string;
  size_bytes: number;
};

type ReleaseManifest = {
  schema_version: 1;
  version: string;
  published_at: string;
  platforms: {
    macos: ReleasePlatform;
    windows: ReleasePlatform;
  };
};

const RELEASE_MANIFEST_URL = "https://downloads.renamer.diegodella.ar/release.json";

function formatBytes(bytes: number) {
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function HowItWorks() {
  return <main><PageHero eyebrow="CÓMO FUNCIONA" title={<>Del archivo críptico al nombre útil, <em>en cuatro pasos.</em></>} text="Configuración mínima, control visible y ningún cambio irreversible."/>
    <section className="steps section">{steps.map(([n, title, text]) => <article key={n}><span>{n}</span><div><h2>{title}</h2><p>{text}</p></div></article>)}</section>
    <section className="mode-comparison section"><div><p className="eyebrow">CONTROL PROGRESIVO</p><h2>Primero sugiere.<br/>Después, si querés, actúa.</h2></div><div className="mode-cards"><article><span>RECOMENDADO PARA EMPEZAR</span><h3>Ask</h3><p>Cada nombre espera tu aprobación. Ideal para aprender cómo trabaja en tus carpetas.</p></article><article><span>CUANDO YA CONFIÁS</span><h3>Automatic</h3><p>Aplica nombres de alta confianza. Los casos dudosos vuelven a la bandeja.</p></article></div></section>
    <section className="final-cta compact"><h2>Tu primer archivo útil está a minutos.</h2><a className="button light" href="/download">Probar la beta <Icon name="arrow"/></a></section>
  </main>;
}

function Download() {
  const [release, setRelease] = useState<ReleaseManifest | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    fetch(RELEASE_MANIFEST_URL, { signal: controller.signal, cache: "no-store" })
      .then((response) => {
        if (!response.ok) throw new Error(`release manifest: ${response.status}`);
        return response.json() as Promise<ReleaseManifest>;
      })
      .then((manifest) => {
        if (manifest.schema_version !== 1 || !manifest.platforms?.macos || !manifest.platforms?.windows) {
          throw new Error("invalid release manifest");
        }
        setRelease(manifest);
      })
      .catch((error: unknown) => {
        if (!(error instanceof DOMException && error.name === "AbortError")) setRelease(null);
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

  const cards = [
    ["macos", "⌘", "MACOS", "Apple Silicon", "DMG", release?.platforms.macos],
    ["windows", "⊞", "WINDOWS", "64 bits", "EXE", release?.platforms.windows],
  ] as const;

  return <main><PageHero eyebrow="DESCARGAR" title={<>Naming Police está en <em>beta de prueba.</em></>} text="Instaladores para Apple Silicon y Windows x64. Esta beta todavía no tiene firma comercial de Apple o Microsoft; el updater interno sí verifica cada actualización."/>
    <section className="download-grid section">
      {cards.map(([key, mark, os, arch, format, platform]) =>
        <article key={key}>
          <div className={`os-mark ${key === "windows" ? "windows" : ""}`}>{mark}</div>
          <div>
            <p className="eyebrow">{os} {platform ? `${platform.min_os}+` : ""}</p>
            <h2>{arch}</h2>
            {platform && release
              ? <>
                  <p>Versión {release.version} · {format} · {formatBytes(platform.size_bytes)}</p>
                  <a className="button download-button" href={platform.url}>Descargar {format} <Icon name="download"/></a>
                  <p className="checksum" title={platform.sha256}>SHA-256: <code>{platform.sha256}</code></p>
                </>
              : <p>{loading ? "Consultando versión disponible…" : "Build todavía no publicado."}</p>}
          </div>
          <span className={`status-pill ${platform ? "available" : ""}`}>{platform ? "Disponible" : loading ? "Verificando" : "Próximamente"}</span>
        </article>,
      )}
    </section>
    <section className="beta-note section"><div className="stamp small-stamp">BETA<br/><strong>ABIERTA</strong></div><div><h2>Aviso de instalación</h2><p>Beta sin firma comercial: macOS Gatekeeper y Windows SmartScreen pueden mostrar una advertencia. Descargá solo desde esta página, verificá el SHA-256 mostrado y probá primero con copias de archivos no críticos.</p><p>macOS: clic derecho sobre Naming Police y elegí “Abrir”. Windows: “Más información” y luego “Ejecutar de todas formas”. Las actualizaciones posteriores se aceptan únicamente si su firma criptográfica coincide con la incluida en la app.</p></div></section>
    <section className="requirements section"><h2>Qué vas a necesitar</h2><div><p><Icon name="check"/> macOS 12+ o Windows 10/11</p><p><Icon name="check"/> Una carpeta con imágenes o PDFs</p><p><Icon name="check"/> Internet solo para IA alojada</p><p><Icon name="check"/> Cero cambios en tu forma de organizar carpetas</p></div></section>
  </main>;
}

function Pricing() {
  return <main><PageHero eyebrow="PRECIOS" title={<>Empezá gratis. Pagá cuando te ahorre <em>trabajo de verdad.</em></>} text="Precios de beta sujetos a validación. No cobramos hasta que los planes estén activos y explicados dentro de la app."/>
    <section className="pricing-grid section">
      <article><p className="eyebrow">FREE</p><h2>USD 0</h2><p>Para probar el flujo en una carpeta.</p><ul><li><Icon name="check"/> 1 carpeta vigilada</li><li><Icon name="check"/> Modo Ask</li><li><Icon name="check"/> Procesamiento local</li><li><Icon name="check"/> Cuota mensual de IA</li><li><Icon name="check"/> Historial limitado</li></ul><a className="button secondary" href="/download">Ver beta</a></article>
      <article className="featured"><span className="case-tag">HIPÓTESIS DE BETA</span><p className="eyebrow">PRO</p><h2>USD 8 <small>/ mes</small></h2><p>Para quien organiza archivos todos los días.</p><ul><li><Icon name="check"/> Carpetas ilimitadas</li><li><Icon name="check"/> Modo automático</li><li><Icon name="check"/> Historial completo</li><li><Icon name="check"/> Mayor cuota de IA</li><li><Icon name="check"/> Tu propia API key</li></ul><a className="button" href="/download">Probar antes de pagar</a></article>
    </section>
    <section className="faq section"><h2>Preguntas frecuentes</h2><details><summary>¿BYOK significa que el producto será gratis?</summary><p>No necesariamente. Tu clave cubre el consumo del modelo; Naming Police aporta watcher, extracción, seguridad, historial, presets y actualizaciones.</p></details><details><summary>¿Hay IA ilimitada?</summary><p>No prometemos consumo ilimitado. La app muestra cuota usada, saldo y fecha de renovación antes de procesar lotes.</p></details><details><summary>¿Ya puedo pagar?</summary><p>No. Los precios son una hipótesis transparente, no una oferta activa. Primero validamos calidad y seguridad de la beta.</p></details></section>
  </main>;
}

function Privacy() {
  return <main><PageHero eyebrow="PRIVACIDAD" title={<>Local-first no significa <em>promesas vagas.</em></>} text="Te decimos qué queda en tu equipo, qué puede salir y quién toma cada decisión."/>
    <section className="data-columns section"><article><span className="data-label local">SIEMPRE LOCAL</span><h2>En tu computadora</h2><ul><li>Carpetas y rutas completas</li><li>Monitoreo y cola de archivos</li><li>Construcción del nombre final</li><li>Renombrado, historial y undo</li><li>Preferencias, reglas y exclusiones</li></ul></article><article><span className="data-label remote">SOLO SI ACTIVÁS IA</span><h2>Puede enviarse</h2><ul><li>Miniatura reducida sin EXIF</li><li>Texto mínimo extraído del PDF</li><li>Metadata necesaria para la regla</li><li>Instrucciones del preset elegido</li></ul></article></section>
    <section className="privacy-details section"><div><h2>La IA interpreta.<br/>La app decide.</h2></div><div><p>El proveedor remoto devuelve datos estructurados: tema, fecha, lugar o tipo de documento. No recibe acceso al sistema de archivos y nunca ejecuta un rename.</p><p>Antes de cada consulta podés ver el payload, desactivar IA por carpeta, usar tu propia API key o trabajar solo con funciones locales.</p><p>La infraestructura procesa contenido en tránsito y no persiste imágenes ni texto de archivos.</p></div></section>
    <section className="legal-callout section"><Icon name="lock" size={36}/><div><h2>Privacidad en beta</h2><p>Antes del lanzamiento público verificaremos configuración y retención del proveedor de IA, logs del Worker y telemetría. Esta página se actualizará cuando cambie el tratamiento de datos.</p></div></section>
  </main>;
}

function About() {
  return <main><PageHero eyebrow="ABOUT" title={<>Una utilidad chica para un problema que aparece <em>todos los días.</em></>} text="Naming Police nace de una observación simple: si para reconocer un archivo tenés que abrirlo, su nombre falló."/>
    <section className="manifesto section"><div className="big-number">01</div><div><h2>Un problema a la vez.</h2><p>No queremos reemplazar Finder, Explorer, Dropbox ni tu forma de organizarte. Naming Police hace una cosa: transforma nombres genéricos en nombres descriptivos y seguros.</p></div></section>
    <section className="principles section"><article><span>01</span><h3>Seguro por defecto</h3><p>Empieza sugiriendo. Automático requiere confianza explícita.</p></article><article><span>02</span><h3>Reversible</h3><p>Cada cambio queda en historial y se puede deshacer.</p></article><article><span>03</span><h3>Honesto con la IA</h3><p>Local-first, no “100% local” cuando interviene un proveedor remoto.</p></article><article><span>04</span><h3>Sin ambición de suite</h3><p>Nombres útiles. Nada de chat, DAM, nube ni carpetas mágicas.</p></article></section>
    <section className="final-cta compact"><h2>Menos arqueología digital.<br/>Más archivos reconocibles.</h2><a className="button light" href="/download">Seguir la beta <Icon name="arrow"/></a></section>
  </main>;
}

function Login() {
  return <main className="center-page"><section className="login-card"><div className="privacy-seal"><Icon name="lock"/><span>ACCESO</span></div><p className="eyebrow">INGRESAR</p><h1>Tu sesión vive dentro de Naming Police.</h1><p>El login se usa en la app desktop para acceder a la cuota de IA alojada. Todavía no existe un dashboard web: preferimos no inventar una pantalla sin función.</p><a className="button" href="/download">Ir a descargas <Icon name="arrow"/></a><a className="text-link" href="/privacy">Cómo protegemos tus datos</a></section></main>;
}

function Terms() {
  return <main><PageHero eyebrow="TÉRMINOS" title={<>Condiciones de la <em>beta.</em></>} text="Resumen claro para una versión todavía no comercial."/>
    <section className="prose section"><h2>Estado del producto</h2><p>Naming Police está en desarrollo y no se ofrece todavía como servicio comercial. Funciones, disponibilidad y precios pueden cambiar antes del lanzamiento.</p><h2>Archivos y copias de seguridad</h2><p>Aunque cada rename guarda historial local y ofrece undo, una beta no reemplaza una copia de seguridad. Probala primero con copias de archivos no críticos.</p><h2>IA remota</h2><p>Las funciones inteligentes pueden depender de servicios externos. El usuario elige si activarlas y debe revisar el payload antes de usar documentos sensibles.</p><h2>Garantías</h2><p>La beta se entrega para evaluación, sin garantía de disponibilidad continua ni adecuación para procesos críticos.</p><h2>Contacto</h2><p>Los datos de contacto y términos legales definitivos se publicarán antes de aceptar pagos o abrir registro público.</p><p className="updated">Última actualización: 30 de julio de 2026.</p></section>
  </main>;
}

function NotFound() {
  return <main className="center-page"><section className="not-found"><span>404</span><h1>Este expediente no existe.</h1><p>Puede que el archivo haya cambiado de nombre.</p><a className="button" href="/">Volver al inicio <Icon name="undo"/></a></section></main>;
}

function PageHero({ eyebrow, title, text }: { eyebrow: string; title: React.ReactNode; text: string }) {
  return <section className="page-hero"><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p>{text}</p></section>;
}

const pages: Record<string, () => React.ReactNode> = {
  "/": Home, "/how-it-works": HowItWorks, "/download": Download, "/pricing": Pricing,
  "/privacy": Privacy, "/about": About, "/login": Login, "/terms": Terms,
};

function App() {
  const Page = pages[window.location.pathname.replace(/\/+$/, "") || "/"] ?? NotFound;
  useEffect(() => {
    window.scrollTo(0, 0);
    const pageName = window.location.pathname === "/" ? "" : ` — ${document.querySelector("h1")?.textContent ?? ""}`;
    document.title = `Naming Police${pageName}`;
  }, []);
  return <><Header/><Page/><Footer/></>;
}

createRoot(document.getElementById("root")!).render(<StrictMode><App/></StrictMode>);
