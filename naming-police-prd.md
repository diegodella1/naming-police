# PRD — Naming Police

**Versión:** 1.0  
**Estado:** Draft para validación y construcción del MVP  
**Producto:** Aplicación desktop local-first para Windows y macOS  
**Owner:** Diego Dell’Agostino  
**Última actualización:** 30 de julio de 2026

---

## 1. Resumen ejecutivo

Naming Police es una aplicación desktop que monitorea carpetas seleccionadas por el usuario y propone o aplica nombres descriptivos, consistentes y fáciles de buscar a los archivos que aparecen en ellas.

Ejemplos:

```text
IMG_4828.jpg
→ playa-atardecer-2026-07-30-imbassai.jpg

Screenshot 2026-07-30 at 15.44.01.png
→ stripe-error-pago-rechazado-2026-07-30.png

scan00023.pdf
→ factura-adobe-2026-07-15-usd-54-99.pdf

final_final_v2.pdf
→ contrato-cesion-marca-v03.pdf
```

La aplicación trabaja en segundo plano, conserva los archivos en la computadora y mantiene un historial local que permite revertir cada cambio.

El producto combina:

- monitoreo local de carpetas;
- extracción local de metadata y texto;
- análisis visual o semántico mediante IA cuando resulte necesario;
- plantillas determinísticas para construir el nombre final;
- validación local para impedir nombres inválidos o colisiones;
- historial y deshacer;
- IA provista por Naming Police o mediante una clave propia del usuario (BYOK).

Naming Police no es un gestor documental, un buscador, un servicio de almacenamiento ni un organizador de carpetas. En su primera etapa resuelve un solo problema:

> Dar automáticamente nombres descriptivos a archivos mal nombrados.

---

## 2. Visión

### Visión de producto

Hacer que los archivos de una computadora sean identificables sin tener que abrirlos.

### Promesa

> Cada archivo recibe un nombre útil desde el momento en que aparece.

### Posicionamiento

Naming Police es “Grammarly para nombres de archivo”: observa, sugiere, corrige y, cuando el usuario confía en el sistema, actúa automáticamente.

### Principios

1. **Un problema a la vez.** El producto renombra archivos; no intenta reemplazar Finder, Explorer, Dropbox ni un DAM.
2. **Local-first.** La observación de carpetas, la metadata, la composición del nombre, el renombrado, el historial y el undo suceden localmente.
3. **Privacidad explícita.** El usuario debe saber exactamente qué información sale de su equipo, cuándo y hacia qué proveedor.
4. **La IA interpreta; la aplicación decide.** El modelo devuelve datos estructurados. Nunca recibe acceso directo al sistema de archivos ni ejecuta el renombrado.
5. **Seguro por defecto.** Durante el onboarding se sugieren nombres, pero no se renombran archivos automáticamente.
6. **Todo cambio es reversible.** Cada operación queda registrada y puede deshacerse.
7. **Configuración mínima.** Los presets resuelven los casos frecuentes sin obligar al usuario a diseñar reglas complejas.
8. **Degradación elegante.** Sin conexión o sin IA disponible, la aplicación conserva sus funciones locales y no modifica archivos de forma riesgosa.

---

## 3. Problema

Las aplicaciones, cámaras, escáneres y sistemas operativos generan archivos con nombres técnicos o genéricos:

```text
IMG_4828.jpg
DSC_1049.NEF
Screenshot (12).png
document.pdf
scan00023.pdf
download (4).pdf
VID_00492.mov
final_final_v2_OK.pdf
```

El contenido puede ser valioso, pero el nombre no explica qué contiene. Esto obliga a abrir archivos para identificarlos y produce:

- búsquedas lentas;
- carpetas de Descargas y Escritorio inservibles;
- versiones ambiguas;
- nombres inconsistentes;
- duplicación de trabajo;
- dificultad para archivar o compartir;
- pérdida de contexto después de semanas o meses;
- convenciones que las personas no aplican de manera consistente.

### Alternativas actuales

- renombrado manual;
- renombradores por lotes basados en reglas;
- gestores de fotos o documentos;
- scripts personalizados;
- herramientas de IA a las que hay que subir archivos;
- aceptar el desorden.

### Por qué no alcanzan

Los renombradores tradicionales modifican patrones existentes, pero no comprenden el contenido. Las herramientas genéricas de IA requieren una acción manual, suelen implicar subir el archivo y no observan carpetas continuamente. Los gestores documentales exigen migrar a otro sistema.

Naming Police se instala sobre el flujo actual: el usuario conserva sus carpetas y aplicaciones.

---

## 4. Objetivos y no objetivos

### Objetivos del MVP

- Permitir seleccionar una o más carpetas locales.
- Detectar archivos nuevos o agregados a esas carpetas.
- Soportar imágenes y PDF.
- Extraer toda la información razonable de forma local antes de consultar IA.
- Generar nombres descriptivos y consistentes.
- Ofrecer análisis mediante el servicio alojado de Naming Police.
- Ofrecer BYOK para proveedores compatibles.
- Mostrar una bandeja de sugerencias con aceptar, editar e ignorar.
- Renombrar sin sobrescribir archivos.
- Mantener historial local y undo.
- Comunicar con precisión qué datos se procesan localmente y cuáles se envían.

### No objetivos del MVP

- Organizar o mover archivos entre carpetas.
- Buscar dentro de todos los archivos del equipo.
- Detectar o borrar duplicados.
- Sincronizar archivos con la nube.
- Gestionar permisos.
- Reemplazar Finder o Windows Explorer.
- Renombrar archivos en NAS o unidades de red.
- Ofrecer colaboración de equipos.
- Procesar bibliotecas administradas por Photos u otras aplicaciones.
- Renombrar archivos pertenecientes a proyectos que dependan de rutas estables.
- Ejecutar modelos locales grandes.
- Permitir automatizaciones arbitrarias o un lenguaje de reglas completo.

---

## 5. Usuarios objetivo

### Usuario primario: profesional creativo individual

Ejemplos:

- fotógrafo;
- diseñador;
- editor de video;
- creador de contenido;
- productor audiovisual;
- social media manager;
- podcaster.

Características:

- genera o recibe muchos archivos;
- trabaja con carpetas locales;
- entiende el costo del desorden;
- valora privacidad y reversibilidad;
- puede pagar por una utilidad que trabaja todos los días.

### Usuario secundario: knowledge worker

Ejemplos:

- consultor;
- abogado;
- contador;
- marketer;
- investigador;
- pequeño empresario.

Casos frecuentes:

- facturas;
- contratos;
- reportes;
- documentos descargados;
- scans;
- capturas de pantalla.

### Usuario futuro: equipo pequeño

Necesita que varias personas apliquen la misma convención. No forma parte del MVP, pero puede habilitar un plan Teams basado en políticas compartidas, sin almacenar archivos.

---

## 6. Jobs to be Done

### Job principal

Cuando aparece un archivo con un nombre genérico, quiero que reciba un nombre que describa su contenido, para poder reconocerlo y encontrarlo sin abrirlo.

### Jobs secundarios

- Cuando descargo un PDF, quiero saber qué documento es con solo ver su nombre.
- Cuando saco o importo fotos, quiero que el nombre incluya escena, fecha y lugar cuando esos datos estén disponibles.
- Cuando tomo una captura, quiero que el nombre describa el tema o error visible.
- Cuando el sistema propone un nombre incorrecto, quiero corregirlo rápidamente.
- Cuando un renombrado causa un problema, quiero revertirlo de inmediato.
- Cuando uso IA alojada, quiero saber qué fue enviado y controlar el consumo.
- Cuando uso mi propia API key, quiero que la aplicación se comunique con el proveedor seleccionado sin pasar por la infraestructura de Naming Police siempre que sea técnicamente posible.

---

## 7. Casos de uso iniciales

### 7.1 Fotos de viaje

Información disponible:

- escena detectada por visión;
- fecha EXIF;
- GPS EXIF;
- ciudad obtenida por reverse geocoding.

Plantilla:

```text
{scene}-{date}-{location}
```

Resultado:

```text
playa-2026-07-30-imbassai.jpg
```

Si no existe una ubicación confiable:

```text
playa-atardecer-2026-07-30.jpg
```

El sistema nunca debe inventar una ciudad solamente porque la imagen “parece” pertenecer a ese lugar.

### 7.2 Screenshots

Información disponible:

- OCR local;
- nombre de la aplicación o ventana, si el sistema lo permite;
- descripción visual;
- fecha de captura.

Plantilla:

```text
{topic}-{date}
```

Resultado:

```text
stripe-error-pago-rechazado-2026-07-30.png
```

### 7.3 Facturas

Información disponible:

- texto extraído localmente;
- proveedor;
- fecha;
- moneda y monto;
- número de factura.

Plantilla:

```text
factura-{vendor}-{date}-{currency}-{amount}
```

Resultado:

```text
factura-adobe-2026-07-15-usd-54-99.pdf
```

### 7.4 Documentos generales

Información disponible:

- título embebido;
- primera página;
- encabezados;
- tipo de documento;
- fecha.

Resultado:

```text
propuesta-redes-sociales-acme-2026-07.pdf
```

---

## 8. Alcance funcional

### 8.1 Carpetas vigiladas

El usuario puede:

- agregar una carpeta;
- quitarla del monitoreo sin modificar sus archivos;
- pausar y reanudar el monitoreo;
- elegir un preset por carpeta;
- elegir un modo de operación;
- excluir subcarpetas;
- definir extensiones admitidas;
- ejecutar un escaneo manual de archivos existentes.

El MVP deberá advertir o bloquear carpetas riesgosas:

- carpetas del sistema;
- directorios de aplicaciones;
- repositorios de código;
- paquetes de macOS;
- bibliotecas de Photos;
- cachés;
- carpetas temporales;
- proyectos creativos con referencias vinculadas;
- ubicaciones de red no soportadas.

### 8.2 Tipos de archivo del MVP

Imágenes:

- JPG/JPEG;
- PNG;
- HEIC/HEIF, sujeto a soporte por plataforma;
- WebP;
- TIFF.

Documentos:

- PDF con texto;
- PDF escaneado mediante OCR local, sujeto a límites de rendimiento.

### 8.3 Presets iniciales

#### General / Downloads

Busca un tema o tipo de documento y agrega fecha solo cuando ayuda.

#### Screenshots

Prioriza el tema, la acción o el error visible. Evita descripciones genéricas como `captura-de-pantalla`.

#### Travel Photos

Prioriza escena, fecha y ubicación confiable.

#### Invoices

Prioriza proveedor, fecha, moneda y monto.

#### Custom básico

Permite:

- seleccionar campos;
- ordenar campos;
- elegir separador;
- establecer longitud máxima;
- elegir mayúsculas, minúsculas o title case;
- definir idioma de salida.

No incluye un DSL ni expresiones arbitrarias en el MVP.

### 8.4 Modos

#### Observe

- analiza archivos;
- muestra sugerencias;
- nunca renombra.

#### Ask

- agrega propuestas a la bandeja;
- permite aceptar, editar o ignorar;
- puede mostrar notificación.

#### Automatic

- aplica nombres cuando se cumplen los umbrales de confianza y seguridad;
- envía a revisión los casos ambiguos;
- puede desactivarse por carpeta;
- solo se habilita después de que el usuario haya probado el modo Ask.

### 8.5 Bandeja de renombrado

Cada elemento debe mostrar:

- nombre actual;
- nombre propuesto;
- miniatura o icono;
- carpeta;
- explicación breve de los campos utilizados;
- confianza;
- fuente de cada dato: EXIF, OCR, metadata, IA, GPS o input del usuario;
- acciones: aceptar, editar, ignorar;
- opción para aplicar a elementos similares cuando sea seguro.

### 8.6 Historial y undo

Cada operación registra localmente:

- identificador;
- ruta anterior;
- ruta nueva;
- timestamp;
- preset;
- modo;
- proveedor de IA, si correspondió;
- estado;
- hash o identificador local;
- motivo de conflicto o error.

Undo debe:

- restaurar el nombre anterior;
- verificar que no haya colisiones;
- advertir si el archivo fue movido, eliminado o modificado externamente;
- registrar también la reversión.

### 8.7 Colisiones

Naming Police nunca sobrescribe archivos.

Si el nombre existe:

```text
playa-2026-07-30-imbassai.jpg
playa-2026-07-30-imbassai-02.jpg
```

El sufijo debe ser determinístico y consistente.

---

## 9. Estrategia de generación de nombres

### 9.1 Pipeline

```text
Archivo detectado
→ esperar a que termine de copiarse/escribirse
→ validar carpeta y extensión
→ calcular identificador/hash cuando corresponda
→ extraer metadata local
→ extraer texto local
→ evaluar si alcanza para nombrar
→ solicitar análisis de IA solo si aporta información
→ validar respuesta estructurada
→ combinar campos con la plantilla
→ sanitizar el nombre
→ comprobar colisiones y riesgos
→ mostrar propuesta o renombrar
→ registrar en historial local
```

### 9.2 Separación de responsabilidades

La IA puede devolver:

```json
{
  "scene": "playa",
  "subject": "familia",
  "activity": "caminando",
  "landmark": null,
  "document_type": null,
  "topic": null,
  "confidence": 0.93
}
```

La IA no devuelve una ruta ni ejecuta operaciones. El motor local:

- selecciona campos;
- agrega fecha y ubicación verificadas;
- traduce o normaliza términos;
- construye el nombre;
- conserva la extensión original;
- sanitiza;
- resuelve colisiones;
- ejecuta el rename.

### 9.3 Jerarquía para ubicación

1. GPS EXIF.
2. Reverse geocoding del GPS.
3. Ubicación definida por el usuario para la carpeta o lote.
4. Contexto de un grupo temporal/geográfico.
5. Landmark visual con alta confianza.
6. Sin ubicación.

La visión no debe asignar una ciudad por semejanza visual genérica.

### 9.4 Grupos

Como optimización posterior al MVP básico, fotos cercanas en tiempo y GPS pueden agruparse para:

- reducir llamadas;
- mantener nombres consistentes;
- compartir contexto de evento o lugar;
- numerar secuencias.

Ejemplo:

```text
playa-imbassai-2026-07-30-001.jpg
playa-imbassai-2026-07-30-002.jpg
playa-imbassai-2026-07-30-003.jpg
```

---

## 10. Modelo local-first y privacidad

### 10.1 Qué significa “local-first”

Siempre ocurre localmente:

- monitoreo de carpetas;
- lectura de rutas;
- extracción de metadata;
- lectura de EXIF;
- generación de thumbnails;
- OCR cuando sea viable;
- extracción de texto de PDF;
- construcción y sanitización del nombre;
- renombrado;
- historial;
- undo;
- preferencias;
- almacenamiento de policies y presets.

### 10.2 Qué puede salir del equipo

Solo cuando el usuario habilita una función de IA remota:

- una miniatura reducida y temporal para análisis visual;
- texto extraído de un documento;
- metadata mínima requerida;
- instrucciones del preset;
- identificadores no reversibles para deduplicación o medición, si el usuario lo acepta.

No deben enviarse rutas locales completas. El sistema debe reducir o eliminar nombres de usuario, nombres de carpetas sensibles y metadata innecesaria.

### 10.3 Distinción que debe ver el usuario

Naming Police no debe afirmar “100% local” cuando usa IA remota.

Mensajes correctos:

> Tus archivos permanecen en tu computadora. Algunas funciones inteligentes pueden enviar una miniatura o texto extraído al proveedor de IA que elegiste. Podés ver y controlar este comportamiento.

Para un modo futuro completamente offline:

> Todo el análisis sucede en tu equipo y ningún contenido se transmite.

### 10.4 Imágenes

Antes de una consulta remota:

- crear una copia en memoria o temporal;
- redimensionar, por ejemplo, a un máximo configurable de 768–1024 px;
- comprimir;
- eliminar EXIF;
- evitar enviar el original;
- eliminar la copia temporal después de completar o fallar la operación.

### 10.5 PDF

El MVP debe preferir enviar texto extraído, no el PDF. Para un documento escaneado:

- ejecutar OCR local;
- enviar solo el texto necesario;
- no enviar páginas renderizadas salvo consentimiento específico y visible.

### 10.6 Controles del usuario

- interruptor global de IA remota;
- control por carpeta;
- vista “qué se enviará”;
- proveedor activo;
- opción de no analizar archivos sensibles;
- extensiones y carpetas excluidas;
- eliminación del historial local;
- exportación del historial;
- modo offline.

### 10.7 Retención del backend

La infraestructura de Naming Police debe:

- procesar contenido en tránsito;
- no persistir imágenes ni texto de archivos;
- evitar logs con contenido;
- registrar solamente métricas operativas mínimas;
- documentar la retención de proveedores externos;
- ofrecer contratos y configuración de proveedores compatibles con la promesa comercial.

La viabilidad exacta depende de las condiciones vigentes de cada proveedor y deberá validarse antes del lanzamiento.

---

## 11. Estrategia de IA

### 11.1 Principio

La IA es una interrupción del pipeline, no el pipeline completo.

Primero se intenta resolver con:

- nombre original;
- extensión;
- carpeta;
- EXIF;
- fecha;
- OCR;
- metadata;
- texto de PDF;
- reglas del preset.

La IA se consulta cuando falta comprensión semántica, por ejemplo:

- describir una fotografía;
- interpretar el tema de una captura;
- clasificar un documento;
- extraer campos ambiguos.

### 11.2 Servicio alojado

Flujo:

```text
Desktop app
→ API de Naming Police
→ proveedor/modelo seleccionado por el servicio
→ respuesta estructurada
→ desktop app
```

Responsabilidades del backend:

- autenticación;
- autorización y cuotas;
- billing;
- routing de modelos;
- validación de payload;
- límites de tamaño;
- reintentos controlados;
- observabilidad sin contenido sensible;
- respuesta estructurada estable;
- protección contra abuso.

Ventajas:

- onboarding simple;
- control de experiencia;
- posibilidad de cambiar de modelo;
- margen incluido en la suscripción.

### 11.3 BYOK

El usuario agrega una clave propia para un proveedor soportado.

Objetivo:

- contenido enviado directamente desde la app al proveedor siempre que el proveedor y la seguridad de la plataforma lo permitan;
- Naming Police no recibe el contenido ni la clave;
- la clave se guarda en el almacén seguro del sistema operativo: Keychain en macOS y Credential Manager/DPAPI en Windows;
- nunca se registra en logs o analytics.

Proveedores candidatos:

- OpenAI;
- Anthropic;
- Google Gemini;
- OpenRouter.

El soporte inicial debe limitarse a uno o dos proveedores para reducir combinaciones, fallas y soporte. La lista definitiva es una pregunta abierta.

### 11.4 Contrato de respuesta

Cada preset usa un esquema JSON versionado. Ejemplo para imágenes:

```json
{
  "schema_version": "1",
  "scene": "playa",
  "subject": "familia",
  "activity": "caminando",
  "landmark": null,
  "topic": null,
  "confidence": 0.93,
  "unsafe_or_sensitive": false
}
```

La app debe:

- validar el esquema;
- rechazar campos inesperados cuando corresponda;
- reintentar una vez ante respuesta inválida;
- usar fallback local;
- enviar a revisión en lugar de renombrar automáticamente si la confianza es baja.

### 11.5 Control de costos

- analizar una sola vez por hash;
- cache local de resultados;
- no analizar nombres que ya sean descriptivos;
- miniaturas pequeñas;
- prompts cortos y específicos;
- JSON estructurado;
- modelos económicos para clasificación;
- modelo superior solo en fallback;
- límites mensuales por plan;
- agrupación de fotos;
- estimación de costo antes de procesar un lote;
- circuit breaker ante consumo anormal.

### 11.6 Seguridad contra contenido malicioso

El contenido de documentos e imágenes se considera datos, no instrucciones. El sistema debe:

- usar prompts que separen contenido e instrucciones;
- solicitar únicamente campos permitidos;
- ignorar instrucciones encontradas dentro de OCR o PDF;
- validar todas las salidas;
- impedir que la respuesta controle rutas o acciones;
- no habilitar tools al modelo.

---

## 12. Experiencia de usuario

### 12.1 Onboarding

#### Paso 1 — Propuesta

```text
Naming Police gives new files useful names.
Your folders stay on this computer.
```

#### Paso 2 — Elegir carpeta

Recomendar:

- Downloads;
- Screenshots;
- otra carpeta.

#### Paso 3 — Elegir preset

La aplicación puede sugerir uno por nombre o ubicación, pero el usuario confirma.

#### Paso 4 — Elegir análisis

- Hosted AI, incluido según plan;
- BYOK;
- solo análisis local.

Debe explicarse qué información se envía en cada opción.

#### Paso 5 — Modo inicial

El MVP comienza en **Ask** u **Observe**, nunca en Automatic.

#### Paso 6 — Primera demostración

Analizar uno o varios archivos y mostrar:

```text
IMG_4828.jpg
→ playa-atardecer-2026-07-30-imbassai.jpg
```

#### Paso 7 — Finalizar

Mostrar estado de monitoreo y acceso a la bandeja.

### 12.2 Flujo de archivo nuevo

1. El watcher detecta un archivo.
2. La app espera a que finalice la escritura.
3. Valida que sea compatible y seguro.
4. Extrae información local.
5. Decide si requiere IA.
6. Genera una propuesta.
7. Según el modo:
   - Observe: registra la sugerencia;
   - Ask: muestra notificación y bandeja;
   - Automatic: renombra si supera los checks.
8. Registra el resultado.

### 12.3 Edición

El usuario puede editar el nombre propuesto sin modificar la extensión. La interfaz debe mostrar:

- contador de longitud;
- caracteres inválidos;
- advertencia de colisión;
- preview final.

### 12.4 Escaneo manual

El usuario puede procesar archivos existentes:

- seleccionar carpeta;
- elegir rango o cantidad;
- ver estimación de llamadas/créditos;
- generar propuestas;
- aprobar individualmente o por lote.

Por seguridad, el MVP puede limitar los lotes.

### 12.5 Confianza

La confianza no debe presentarse como una precisión científica. Puede expresarse como:

- Alta: apto para automático;
- Media: revisar;
- Baja: faltan datos.

La decisión final combina:

- confianza del modelo;
- disponibilidad de campos obligatorios;
- fuente de ubicación;
- colisiones;
- sensibilidad del archivo;
- comportamiento histórico del preset.

### 12.6 Barra de menú / system tray

Funciones rápidas:

- estado: activo o pausado;
- cantidad pendiente;
- abrir bandeja;
- pausar 1 hora;
- pausar carpeta;
- abrir historial;
- salir.

---

## 13. Requisitos funcionales del MVP

### P0 — Imprescindibles

- App compatible con Windows y macOS.
- Instalación y actualizaciones firmadas.
- Selección de carpetas.
- Monitoreo persistente.
- Detección de archivos terminados de escribir.
- Imágenes y PDF.
- Metadata/EXIF local.
- Texto local de PDF.
- OCR local básico donde sea viable.
- Generación local de thumbnail.
- Un proveedor de IA alojado.
- Al menos un proveedor BYOK.
- Presets: General, Screenshots, Travel Photos, Invoices.
- Salida estructurada validada.
- Constructor y sanitizer local.
- Modos Observe y Ask.
- Preview, aceptar, editar e ignorar.
- Historial SQLite local.
- Undo.
- Manejo de colisiones sin sobrescritura.
- Exclusiones de seguridad.
- Controles de privacidad.
- Estados offline y de error.
- Cuotas o créditos visibles para hosted AI.

### P1 — Importantes después de validar

- Automatic mode.
- Procesamiento por lote.
- Agrupación de fotos.
- Más proveedores BYOK.
- Plantilla custom básica.
- Notificaciones configurables.
- Exportación/importación de configuración.
- Pausa temporal.
- Actualizaciones automáticas.

### P2 — Futuro

- Office;
- audio;
- video;
- modelos completamente locales;
- políticas compartidas;
- presets de comunidad;
- integración con menú contextual;
- reglas más avanzadas;
- automatización basada en feedback del usuario.

---

## 14. Arquitectura

### 14.1 Componentes locales

```text
Desktop UI
├── Onboarding y settings
├── Folder manager
├── Rename inbox
├── History / Undo
└── Privacy & usage

Local Core
├── File watcher
├── Stable-file detector
├── Type detector
├── Metadata / EXIF extractor
├── OCR / PDF text extractor
├── Thumbnail generator
├── Analysis orchestrator
├── Provider adapters
├── Filename builder
├── Sanitizer / collision resolver
├── Rename executor
└── Local database
```

### 14.2 Componentes remotos

```text
API Gateway
├── Authentication
├── Entitlements / quotas
├── Request validation
├── AI router
├── Structured-output validation
├── Rate limiting
└── Privacy-safe observability

Commercial Services
├── Accounts
├── Billing
├── Subscription status
└── Usage ledger
```

### 14.3 Flujo alojado

```text
Archivo local
→ extracción/thumbnail local
→ payload mínimo
→ API de Naming Police
→ modelo
→ campos estructurados
→ validación local
→ nombre final local
→ rename local
```

### 14.4 Flujo BYOK

```text
Archivo local
→ extracción/thumbnail local
→ proveedor elegido, directo desde la app
→ campos estructurados
→ validación local
→ nombre final local
→ rename local
```

### 14.5 Datos locales

SQLite:

- carpetas vigiladas;
- presets y configuración;
- historial de operaciones;
- cache por hash;
- estado de cola;
- consumo mostrado;
- errores sin contenido sensible.

Secret store del sistema:

- tokens de sesión;
- claves BYOK;
- secretos locales.

### 14.6 Estado de archivos

Estados sugeridos:

```text
detected
waiting_for_stability
extracting
awaiting_ai
suggested
approved
renamed
ignored
failed
undone
```

La cola debe sobrevivir reinicios y evitar procesar el mismo evento varias veces.

---

## 15. Stack técnico recomendado

### Desktop

- **Tauri 2** para aplicación cross-platform y acceso nativo.
- **React + TypeScript** para la interfaz.
- **Rust** para watcher, filesystem, sanitización, extracción y operaciones sensibles.
- **SQLite** para estado, historial y cache.

### Capacidades locales

Seleccionar librerías después de un spike técnico para:

- file watching cross-platform;
- EXIF;
- HEIC/HEIF;
- image resize;
- hashing;
- extracción de texto PDF;
- OCR;
- geocoding y cache;
- keychain/credential storage.

### Backend

Opción recomendada para el MVP:

- TypeScript;
- API serverless o servicio pequeño;
- PostgreSQL para cuentas, suscripciones y ledger;
- Stripe para billing;
- proveedor de autenticación administrado o auth propio mínimo;
- adapter de modelos;
- rate limiting;
- logging sin payload.

El backend no requiere almacenamiento de archivos.

### Distribución

- instalador firmado para Windows;
- app firmada y notarizada para macOS;
- mecanismo de actualización segura;
- CI para builds de ambas plataformas;
- telemetría opt-in o estrictamente limitada.

### Consideraciones técnicas críticas

- permisos de carpetas y sandboxing de macOS;
- code signing y notarization;
- antivirus y reputación de binarios en Windows;
- rutas largas y nombres reservados;
- Unicode y normalización;
- archivos bloqueados por otra aplicación;
- eventos duplicados del watcher;
- archivos de nube “placeholder”;
- case sensitivity;
- volúmenes externos;
- latencia y disponibilidad de proveedores;
- compatibilidad HEIC.

---

## 16. Reglas de nombres

### Sanitización

- conservar la extensión original;
- eliminar caracteres inválidos;
- normalizar Unicode;
- reemplazar espacios por el separador elegido;
- colapsar separadores repetidos;
- eliminar separadores al inicio y final;
- limitar longitud;
- evitar nombres reservados de Windows;
- evitar punto o espacio final;
- no producir rutas que excedan límites seguros;
- aplicar casing configurado;
- transliterar solo si el usuario lo elige.

### Longitud

Valor inicial sugerido:

- 80 caracteres para el stem;
- configurable en versiones posteriores.

### Idioma

La salida debe poder respetar:

- idioma del sistema;
- idioma elegido por el usuario;
- términos propios detectados, como marcas y nombres.

### Fecha

Formato recomendado:

```text
YYYY-MM-DD
```

Evita ambigüedad y ordena cronológicamente.

### Versiones

La normalización de `final_final_v2` puede ser útil, pero deberá limitarse en el MVP. Inferir una versión correcta sin contexto puede ser riesgoso. En la primera versión:

- puede limpiar redundancias evidentes;
- no debe inventar números de versión;
- debe enviar casos ambiguos a revisión.

---

## 17. Requisitos no funcionales

### Seguridad

- El modelo nunca recibe herramientas.
- El backend valida tamaño, tipo y esquema.
- Las claves se almacenan con mecanismos del sistema operativo.
- Los logs no contienen archivos, thumbnails, OCR ni claves.
- No se siguen symlinks de manera insegura.
- Las operaciones se restringen a carpetas autorizadas.
- No se sobrescriben archivos.

### Confiabilidad

- Cero pérdida de archivos como objetivo.
- Cola durable.
- Operaciones idempotentes.
- Recuperación después de cierre inesperado.
- Undo verificable.
- Fallback a revisión ante incertidumbre.

### Rendimiento

Objetivos iniciales:

- impacto mínimo en CPU cuando está inactiva;
- detección de archivo dentro de pocos segundos;
- propuesta local simple en menos de 2 segundos;
- propuesta con IA normalmente en menos de 10 segundos;
- UI responsiva durante lotes;
- thumbnails pequeños y temporales.

### Accesibilidad

- navegación por teclado;
- contraste adecuado;
- labels para lectores de pantalla;
- estados no comunicados solo por color;
- confirmaciones claras.

### Privacidad y cumplimiento

- política de privacidad legible;
- consentimiento para análisis remoto;
- documentación de subprocesadores;
- mecanismo de eliminación de cuenta;
- minimización de datos;
- evaluación legal según mercados de lanzamiento.

---

## 18. Modelo comercial y pricing

El pricing deberá validarse con entrevistas y una landing antes de fijarse. Hipótesis inicial:

### Free

- 1 carpeta;
- modo Observe/Ask;
- límite mensual de sugerencias alojadas;
- historial limitado;
- imágenes y PDF;
- procesamiento local ilimitado cuando no consume IA.

### Pro — hipótesis: USD 8/mes o USD 79/año

- carpetas ilimitadas;
- mayor cuota de IA alojada;
- historial completo;
- modo automático;
- procesamiento por lote;
- todos los presets;
- prioridad de análisis;
- BYOK.

### BYOK

BYOK no elimina necesariamente la suscripción: el usuario sigue pagando por watcher, extracción, UX, seguridad, actualizaciones, presets e historial. Puede ofrecerse:

- incluido en Pro; o
- en un plan más económico con poco o ningún consumo alojado.

La segunda opción puede reducir objeciones de usuarios avanzados.

### Teams — futuro

Hipótesis:

- precio por asiento;
- presets y policies compartidas;
- administración de licencias;
- sin almacenamiento de archivos;
- analítica agregada sin contenido.

### Límites

Evitar “IA ilimitada” sin fair-use. Mostrar:

- sugerencias usadas;
- saldo o cuota;
- fecha de renovación;
- estimación para lotes;
- opción de cambiar a BYOK.

---

## 19. Métricas

### North Star

**Cantidad de archivos renombrados y no revertidos por usuario activo por semana.**

Mide valor entregado, no solo actividad.

### Activación

- instalación completada;
- primera carpeta agregada;
- primer archivo analizado;
- primera sugerencia aceptada;
- cinco sugerencias aceptadas;
- watcher activo después de 24 horas.

### Confianza

- tasa de aceptación sin edición;
- tasa de edición;
- tasa de ignore;
- tasa de undo;
- tasa de errores;
- tiempo hasta habilitar Automatic;
- porcentaje de Automatic enviado a revisión.

### Retención

- watcher activo en semana 1, 4 y 8;
- archivos procesados por semana;
- carpetas activas;
- porcentaje que mantiene la app iniciándose con el sistema.

### Economía

- costo de IA por usuario;
- costo por sugerencia aceptada;
- margen bruto por plan;
- porcentaje BYOK;
- distribución por tipo de archivo;
- llamadas evitadas por cache o extracción local.

### Privacidad

- porcentaje que elige hosted AI, BYOK o local-only;
- frecuencia de uso de “ver qué se envía”;
- incidentes de contenido en logs: objetivo cero.

---

## 20. MVP propuesto

### Hipótesis a validar

1. Los usuarios valoran nombres descriptivos lo suficiente como para instalar una app residente.
2. Confían en una aplicación que renombra cuando existe preview y undo.
3. Las imágenes y PDF cubren una parte suficiente del dolor.
4. Los presets producen resultados útiles sin configuración compleja.
5. Hosted AI puede operar con margen a un precio cercano a USD 8/mes.
6. BYOK mejora conversión entre usuarios sensibles a privacidad o costo.

### Alcance recomendado

- Windows y macOS.
- Imágenes y PDF.
- Una o más carpetas seleccionadas.
- Presets General, Screenshots, Travel Photos e Invoices.
- Observe y Ask.
- Hosted AI con un modelo/proveedor.
- BYOK con un proveedor.
- Metadata, EXIF, extracción PDF y thumbnails locales.
- OCR local básico.
- Rename Inbox.
- Aceptar, editar e ignorar.
- Historial y undo.
- Sanitización y colisiones.
- Cuota visible.
- Privacidad explícita.

### Corte posible para una beta todavía más pequeña

Si construir ambas plataformas y ambos tipos demora demasiado:

- una plataforma inicial;
- imágenes JPG/PNG primero;
- Downloads y Screenshots;
- Ask solamente;
- hosted AI y un único BYOK;
- sin procesamiento histórico por lote.

La elección debe basarse en dónde estén los primeros diez usuarios.

### Criterios de salida de beta

- ningún caso conocido de pérdida o sobrescritura;
- undo confiable;
- más de 70% de sugerencias aceptadas o editadas;
- menos de 2% de undo involuntario;
- costo de IA compatible con el margen objetivo;
- al menos 30% de usuarios beta activos después de cuatro semanas;
- telemetría y logs sin contenido sensible verificados;
- instaladores firmados y actualizaciones funcionales.

---

## 21. Roadmap

### Fase 0 — Descubrimiento y spikes

- 15–20 entrevistas;
- prueba de concepto de watcher;
- spike EXIF/HEIC/PDF/OCR;
- spike de modelos visuales;
- prueba de nombres con dataset real;
- evaluación de firma, notarización y updates;
- landing y prueba de pricing.

### Fase 1 — Alpha local

- una plataforma;
- carpetas;
- watcher;
- imágenes;
- extracción local;
- rename inbox;
- historial;
- undo;
- proveedor alojado.

### Fase 2 — Beta privada

- segunda plataforma;
- PDF;
- OCR;
- BYOK;
- presets completos;
- privacy controls;
- billing;
- cuotas;
- estabilidad y auto-update.

### Fase 3 — V1 pública

- modo Automatic con guardrails;
- procesamiento por lote limitado;
- agrupación de fotos;
- mejores notificaciones;
- custom template básica;
- onboarding refinado;
- documentación y soporte.

### Fase 4 — Expansión

- Office;
- audio y video;
- providers adicionales;
- inferencia completamente local opcional;
- policies exportables;
- plan Teams;
- presets compartidos.

### Fuera del roadmap cercano

- gestor documental;
- búsqueda semántica global;
- almacenamiento cloud;
- movimiento automático de archivos;
- deduplicación o limpieza destructiva;
- chat con archivos.

---

## 22. Riesgos y mitigaciones

### Riesgo 1 — El renombrado rompe referencias

Ejemplos: Premiere, After Effects, código, documentos vinculados.

Mitigaciones:

- exclusiones por defecto;
- advertencias por tipo de carpeta;
- Ask antes de Automatic;
- detectar extensiones/proyectos conocidos;
- no procesar archivos abiertos o recién modificados;
- undo;
- educación clara.

### Riesgo 2 — La IA produce nombres incorrectos

Mitigaciones:

- salida estructurada;
- construcción local;
- fuentes verificables;
- umbrales;
- ubicación solo con evidencia;
- revisión ante baja confianza;
- feedback de edición;
- pruebas con datasets por preset.

### Riesgo 3 — Promesa de privacidad confusa

Mitigaciones:

- no usar “100% local” para IA remota;
- mostrar qué se envía;
- procesar miniaturas/texto mínimo;
- no persistir contenido;
- BYOK directo;
- futuro modo offline real.

### Riesgo 4 — Costos de IA erosionan margen

Mitigaciones:

- extracción local primero;
- cache por hash;
- modelos en cascada;
- límites;
- BYOK;
- agrupación;
- métricas por preset;
- no analizar nombres ya descriptivos.

### Riesgo 5 — Se percibe como utility de pago único

Mitigaciones:

- valor residente y continuo;
- cuota alojada;
- mejoras frecuentes de presets;
- historial y automático;
- precio anual competitivo;
- considerar licencia perpetua separada con BYOK si el mercado rechaza suscripción.

### Riesgo 6 — Complejidad cross-platform

Mitigaciones:

- beta en una plataforma si es necesario;
- core en Rust;
- tests de filesystem;
- matriz de OS/filesystem;
- inversión temprana en signing y updates.

### Riesgo 7 — OCR y HEIC inconsistentes

Mitigaciones:

- declarar soporte real por plataforma;
- fallback;
- no bloquear el pipeline;
- tests con archivos reales;
- ampliar formatos gradualmente.

### Riesgo 8 — Contenido sensible

Mitigaciones:

- controles por carpeta;
- local-only;
- preview de payload;
- exclusiones;
- redacción de PII donde sea viable;
- política de no retención.

### Riesgo 9 — El watcher procesa archivos incompletos

Mitigaciones:

- stable-file detector;
- backoff;
- locks;
- tamaño estable durante una ventana;
- cola durable;
- reintentos.

### Riesgo 10 — Prompt injection desde documentos

Mitigaciones:

- contenido tratado como datos;
- esquema cerrado;
- sin tools;
- validación local;
- modelo incapaz de controlar rutas o operaciones.

---

## 23. Preguntas abiertas

### Producto

1. ¿El primer wedge debe ser Downloads, Screenshots o fotos de viaje?
2. ¿La primera audiencia debe ser generalista o fotógrafos/creativos?
3. ¿Cuántas carpetas soporta Free?
4. ¿Automatic debe entrar en V1 o después de validar Ask?
5. ¿Debe existir escaneo de archivos históricos en el MVP?
6. ¿Cómo se define objetivamente un nombre “descriptivo” por preset?
7. ¿La app aprende de las ediciones del usuario localmente?
8. ¿Qué idiomas se soportan al lanzamiento?

### IA

9. ¿Qué proveedor ofrece la mejor relación costo/calidad/privacidad?
10. ¿Qué proveedor BYOK se implementa primero?
11. ¿Conviene enviar imágenes al backend o usar URLs firmadas efímeras sin persistencia?
12. ¿Qué límites mensuales mantienen margen saludable?
13. ¿Qué umbral habilita Automatic?
14. ¿Se admite análisis visual remoto de PDFs escaneados o solo OCR local?

### Privacidad y legal

15. ¿Qué promesas de no retención pueden garantizarse con cada proveedor?
16. ¿Qué métricas pueden recogerse sin contenido ni rutas?
17. ¿Es necesario un DPA en el lanzamiento?
18. ¿Cómo se comunica BYOK sin sugerir que elimina toda transmisión externa?

### Técnica

19. ¿Qué calidad y rendimiento ofrece OCR local en cada OS?
20. ¿Cómo manejar placeholders de OneDrive, iCloud y Dropbox?
21. ¿HEIC entra realmente en el MVP de ambas plataformas?
22. ¿Qué estrategia de hashing evita consumo excesivo en archivos grandes?
23. ¿Cómo detectar de forma confiable que un archivo está abierto o vinculado?
24. ¿Cuál es el límite seguro de longitud por sistema y volumen?

### Negocio

25. ¿Suscripción, pago único o modelo híbrido?
26. ¿BYOK se incluye en Pro o tiene un plan propio?
27. ¿Qué precio soporta adquisición pagada?
28. ¿Los usuarios pagan por renombres, créditos o una cuota simple?
29. ¿Existe demanda suficiente para Teams sin ampliar el producto?

---

## 24. Plan de validación

### Entrevistas

Reclutar:

- 5 fotógrafos o creadores;
- 5 diseñadores/productores;
- 5 knowledge workers;
- 5 usuarios con alta sensibilidad a privacidad.

Preguntas basadas en comportamiento:

- Mostrame tu carpeta Downloads.
- ¿Qué nombres corregiste esta semana?
- ¿Qué archivos no pudiste encontrar?
- ¿Qué carpetas nunca permitirías que una app tocara?
- ¿Aceptarías que se envíe una miniatura reducida? ¿Y OCR?
- ¿Qué tendría que mostrar la app para que habilites automático?
- ¿Cuánto pagás hoy por utilities residentes?

### Concierge test

Antes de automatizar todo:

1. El usuario entrega una copia controlada de 50–100 archivos de prueba.
2. Se generan propuestas con el pipeline previsto.
3. El usuario acepta, edita o rechaza.
4. Se mide calidad por preset.

No usar archivos reales sensibles sin consentimiento y manejo adecuado.

### Dataset de evaluación

Crear datasets anonimizados por categoría:

- travel photos;
- screenshots;
- invoices;
- general PDFs.

Medir:

- campos correctos;
- falsos lugares;
- nombres duplicados;
- longitud;
- aceptación humana;
- costo;
- latencia.

---

## 25. Decisiones recomendadas para comenzar

1. Mantener el nombre “Naming Police” como working title y validar marca antes del lanzamiento.
2. Definir el producto como **local-first**, no como 100% offline.
3. Empezar siempre en modo Ask.
4. Construir el nombre final localmente a partir de campos estructurados.
5. No enviar originales: thumbnails para imágenes y texto extraído para PDF.
6. Implementar hosted AI y un solo proveedor BYOK en el MVP.
7. Priorizar Screenshots, Travel Photos e Invoices como presets demostrables.
8. Hacer de undo, colisiones y exclusiones requisitos P0.
9. No agregar movimiento de carpetas, búsqueda, duplicados ni chat.
10. Validar pricing de suscripción y una alternativa híbrida antes de comprometer el modelo comercial.

---

## 26. Pitch

### Una frase

> Naming Police da automáticamente nombres descriptivos a tus archivos cuando aparecen, trabajando desde tu computadora y sin cambiar la forma en que organizás tus carpetas.

### Versión corta

Tus fotos, screenshots y PDFs dejan de llamarse `IMG_4828`, `Screenshot (12)` o `document.pdf`. Naming Police observa las carpetas que elegís, entiende el contenido, propone un nombre útil y conserva un historial para deshacer cualquier cambio.

### Mensaje de privacidad

> Tus archivos permanecen en tu computadora. Cuando activás IA remota, Naming Police envía únicamente una miniatura reducida o el texto mínimo necesario al proveedor elegido. También podés usar tu propia API key o trabajar solo con funciones locales.

---

## 27. Definición de éxito

Naming Police habrá encontrado product-market fit inicial cuando un grupo consistente de usuarios:

- mantenga el watcher activo;
- acepte la mayoría de las sugerencias sin edición;
- confíe lo suficiente para habilitar Automatic en carpetas específicas;
- procese cientos de archivos al mes;
- experimente una tasa de undo muy baja;
- continúe pagando porque el producto elimina una tarea recurrente, no porque almacena sus archivos.

El objetivo no es construir un sistema operativo para documentos. Es lograr que una tarea pequeña, repetitiva y universal desaparezca:

> Nunca más abrir un archivo solamente para descubrir qué es.
