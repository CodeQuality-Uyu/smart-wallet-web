# Integración con Gmail — Importar gastos desde el correo

Documento explicativo y de capacitación sobre la integración que permite importar
gastos leyendo los **avisos de compra** que el banco/tarjeta manda por email, sin
esperar al reporte de fin de mes. Es la primera de un conjunto de **"Fuentes de
datos"** (a futuro: SMS, API bancaria).

> **Estado:** el MVP está **completo** de punta a punta — conexión OAuth, config
> persistida cross-device, y el flujo "Sincronizar ahora" (fetch → parse con
> Gemini → cola → revisión → alta de gastos con dedup). Todo funciona en modo MSW
> con mails mock. Queda como Fase 2 el sync automático en background (ver [Roadmap](#roadmap)).

---

## 1. La idea en una frase

El usuario aprieta un botón **"Sincronizar con Gmail"**, la app lee los mails de
compra de los remitentes que configuró, los convierte en gastos candidatos con
ayuda de Gemini, y el usuario confirma cuáles registrar — reutilizando la misma
experiencia de revisión que ya existe para importar un PDF de resumen.

---

## 2. La decisión de arquitectura central

Leer Gmail se puede hacer de dos formas, y la elección condiciona todo:

| | **A. OAuth desde el navegador** (elegido) | **B. Backend con sync automático** |
|---|---|---|
| Dónde corre | 100% en el cliente (React) | Cloud Function (servidor) |
| Requiere plan Blaze | ❌ No | ✅ Sí |
| Sync en background | ❌ No — el usuario abre la app y sincroniza | ✅ Sí — corre solo cada X horas |
| Token que usa | Access token (~1h, en memoria) | Refresh token (largo, guardado en servidor) |
| Complejidad | Baja | Alta (guardar tokens de forma segura) |

**Elegimos A** para el MVP: entrega el 80% del valor (ver los gastos apenas llegan,
sin esperar a fin de mes) sin infraestructura nueva. El sync automático (B) queda
como **Fase 2**, cuando se migre a Blaze. Toda la lógica de parsing/dedup/creación
del MVP se reutiliza server-side en la Fase 2.

---

## 3. OAuth explicado (por qué la config de Google Cloud es obligatoria)

Una pregunta natural: *"¿por qué configurar tanto en Google Cloud y no simplemente
mostrar el popup típico de Gmail?"* La respuesta: **ese popup ES el resultado de
esta configuración**. No hay forma de obtenerlo sin registrar la app.

Antes de mostrarle el popup a cualquier usuario, Google exige que la app declare
tres cosas:

1. **Quién es la app** → el **OAuth Client ID** (la identidad de la app).
2. **Qué muestra el popup** → la **pantalla de consentimiento** (nombre, email de
   soporte, logo).
3. **Qué permiso pide** → el **scope**. En nuestro caso
   `https://www.googleapis.com/auth/gmail.readonly`, que Google clasifica como
   **restringido** porque los mails son datos sensibles.

Sin declarar esos tres, Google **rechaza** la solicitud (`invalid_scope` /
`access_denied`) y el popup ni siquiera abre.

> **Punto clave:** esta configuración se hace **una sola vez**, la hace el
> desarrollador, y **no es por usuario**. Cada persona (la familia) solo ve el
> popup y toca "Permitir" — un click, cero configuración. Ese click es lo que
> dispara `requestGmailAccess()` en el código.

### ¿Por qué no alcanzaba con el login de Google que ya existía?

Firebase Auth ya había creado un OAuth Client para el login con Google, **pero con
permisos básicos** (email, perfil). `gmail.readonly` es un permiso restringido
aparte: hay que **agregarlo explícitamente** a la pantalla de consentimiento, si no
Google no deja pedirlo.

---

## 4. Modo Testing y usuarios de prueba

Toda app OAuth tiene un **estado de publicación**: *Testing* o *En producción*.

- **Testing** (donde queda esta app): solo los emails agregados como **usuarios de
  prueba** (hasta 100) pueden autorizar. Cualquier otro recibe *"Acceso
  bloqueado"*. **No requiere verificación de Google**, aun usando un scope
  restringido.
- **En producción**: cualquiera puede autorizar, **pero** para scopes restringidos
  Google exige una **verificación** (revisión de seguridad, política de privacidad
  publicada, a veces auditoría paga) — un trámite pensado para apps públicas.

Como SmartWallet es de **uso familiar**, Testing + los emails de la familia como
usuarios de prueba es exactamente la vía correcta: sin trámites, con el popup normal.

> **⚠️ Caveat para la Fase 2:** en modo Testing los **refresh tokens caducan a los
> 7 días**. Para el MVP actual (access token en memoria de ~1h) **no afecta en
> nada**. Pero el sync automático de la Fase 2 (que depende de un refresh token de
> larga vida) se rompería cada 7 días — ahí habría que evaluar publicar + verificar.

### Config de Google Cloud aplicada (proyecto `smart-wallet-dev`)

1. **Gmail API** habilitada en la Biblioteca de APIs.
2. **Pantalla de consentimiento (Google Auth Platform)** configurada: nombre de la
   app, email de soporte, tipo **Externo**.
3. **Scope** `.../auth/gmail.readonly` agregado en *Acceso a los datos*.
4. **Usuarios de prueba** agregados (emails de la familia).

> Si producción usa **otro proyecto** Firebase (ej. `smart-wallet-prod`), estos
> pasos hay que repetirlos ahí.

---

## 5. Qué se persiste y qué no (diseño de seguridad)

Esta es la parte más importante de entender. Hay que separar dos datos que es fácil
confundir:

| Dato | ¿Se persiste? | Dónde | Por qué |
|---|---|---|---|
| **Configuración**: remitentes, ventana, última sync, "vinculado" | ✅ Sí | **Firestore** (`users/{uid}.gmailIntegration`) | Para que la vinculación y ajustes sigan al usuario entre dispositivos (celu, otra compu) |
| **Access token** de Gmail | ❌ **Nunca** | Solo memoria de sesión | Es sensible y dura ~1h; guardarlo (Firestore/localStorage) es un riesgo y es inútil (expira) |

**Consecuencia práctica:** el access token se obtiene con Google Identity Services
(GIS) **cuando el usuario hace una acción** (Conectar / Sincronizar) — no de forma
automática al abrir, para no disparar un popup de sorpresa. GIS intenta resolverlo
en silencio, pero su *token client* **no garantiza un flujo sin popup**: con las
cookies de terceros restringidas (Chrome/Safari modernos) cae a un popup. El
consentimiento sí se guarda en la cuenta de Google, así que no hay que volver a
*aceptar* el permiso, pero puede aparecer un popup breve por sesión. El único modo
de renovación **verdaderamente invisible** (y sync con la app cerrada) es un refresh
token del lado servidor = **Fase 2 (Blaze)**.

Por eso el modelo distingue:

- `linked: boolean` → "el usuario autorizó su cuenta alguna vez" (persiste cross-device).
- Token en memoria → "esta sesión puede sincronizar ahora" (efímero).

---

## 6. Dos conceptos separados: ventana vs cola

Al diseñar el sync aparecen dos cosas que NO son lo mismo:

- **Fuentes de búsqueda** → de dónde salen los mails. Dos tipos, que se combinan
  con **OR**: los **remitentes** (ej. `avisos@banco.com.uy`) y las **etiquetas** de
  Gmail (ej. `Banco`). Un mail sirve si viene de un remitente *o* tiene una
  etiqueta configurada. Se traduce a una query de Gmail
  (`(from:(a OR b) OR label:Banco) newer_than:7d`) — ver `buildGmailQuery()` en
  `backend/firestore/gmail.ts`. Si no hay ninguna fuente, no se busca nada (para no
  bajar toda la bandeja por accidente).
- **Ventana de búsqueda** → cuánto hacia atrás pedirle a Gmail. Default **7 días**
  (pensado para un sync manual los domingos), editable. Gobierna solo qué mails
  *nuevos* se traen.
- **Cola de pendientes** → los mails ya parseados pero **no confirmados todavía**.
  Persiste indefinidamente, independiente de la ventana.

Por qué importa: si un domingo dejás 3 mails sin confirmar y al siguiente
sincronizás con ventana de 7 días, esos 3 viejos **no se pierden** — viven en la
cola, no en la ventana. Además se guarda el set de `gmailMessageId` ya vistos para
**no reprocesar** lo mismo en cada sync.

> **Ventana auto-sugerida:** como se guarda la fecha de la última sync, si pasó más
> tiempo que el default la app sugiere ampliarla (ej. última hace 12 días → propone
> 14). Resuelve el caso "me salté un domingo" sin que el usuario tenga que acordarse.
> Ver `suggestedWindowDays()` en `useGmailIntegration.ts`.

---

## 7. Experiencia de revisión (reusa el flujo de PDF)

El sync no crea gastos automáticamente. Muestra los mails parseados en una **tabla
de revisión** (la misma de `StatementImportModal`, generalizada) con **tres estados
por fila**:

| Acción | Efecto | ¿Reaparece en la próxima sync? |
|---|---|---|
| ✅ Check | Se crea como gasto real | No (procesado) |
| ⬜ Sin check | Queda pendiente | **Sí** — vuelve a la tabla |
| 🗑️ Descartar | Visto + ignorado, no crea gasto | No (nunca más) |

El **descartar** cubre el caso "este gasto ya lo cargué por otro flujo": lo saca de
la cola sin crear duplicado y sin que reaparezca.

**Dedup:** se comparan los candidatos contra los gastos existentes por **fecha +
descripción (difusa, Levenshtein) + monto + moneda**. Se excluyen categoría y local
porque pueden faltar y darían falsos negativos. La descripción se compara difusa
porque la de un mail de tarjeta ("Compra en RES XXXX") casi nunca coincide textual
con la del PDF o la cargada a mano.

---

## 8. Arquitectura de código

Sigue el patrón backend-agnóstico del proyecto (`IXxxBackend` → firestore + msw →
service → hook), igual que el resto de features.

| Archivo | Rol |
|---|---|
| `src/types/models/index.ts` → `GmailIntegration` | Modelo de la config persistida |
| `src/backend/types.ts` → `IIntegrationsBackend` | Interfaz backend (`getGmail` / `setGmail`) |
| `src/backend/firestore/integrations.ts` | Impl. producción: campos `gmailIntegration` (config) y `gmailQueue` (pendientes + vistos) en `users/{uid}`; helpers `mergeSeenIds` / `mergePending` |
| `src/backend/msw/integrations.ts` | Impl. dev: HTTP contra el handler MSW |
| `src/backend/index.ts` → `getIntegrationsBackend()` | Registro en el factory (lazy singleton) |
| `src/services/integrationsService.ts` | Capa service que envuelve el backend |
| `src/features/integrations/hooks/useGmailIntegration.ts` | Hooks React Query: config (`useGmailIntegration`/`useSetGmailIntegration`) + cola (`useGmailQueue`/`useRemoveGmailPending`) + `suggestedWindowDays` |
| `src/features/integrations/gmailAuth.ts` | OAuth de Gmail: token en memoria (`requestGmailAccess`, `getGmailAccessToken`, `clearGmailAccess`) |
| `src/backend/{firestore,msw}/gmail.ts` | `IGmailBackend`: `listLabels` + `fetchMessages`. La impl. de prod llama a la Gmail REST API; incluye helpers puros (`buildGmailQuery`, `decodeBase64Url`, `extractBody`, `parseGmailMessage`) |
| `src/services/gmailService.ts` | Capa service del fetch de mails |
| `src/services/gmailParseService.ts` | Parse con Gemini: mail → gasto candidato (`GmailParsedLine`); descarta no-transacciones. Helpers puros `buildEmailParsePrompt` / `parseGeminiEmailResponse` |
| `src/services/gmailSyncService.ts` | Orquestador `syncGmail`: fetch → filtra vistos → parse → cola (seen + pending) |
| `src/tests/backend/gmail.test.ts`, `src/tests/services/gmailParseService.test.ts` | Tests de los helpers puros (query, decode, parse de mail, parse de respuesta Gemini) |
| `src/pages/IntegrationsPage/` | UI: lista de integraciones + panel de Gmail (conexión / config / sync / revisar) |
| `src/features/statements/components/ImportReviewTable.tsx` | Tabla de revisión **compartida** entre el import de PDF y el de Gmail (presentacional) |
| `src/features/integrations/components/GmailImportModal.tsx` | Modal de revisión de Gmail: reusa `ImportReviewTable`; guarda con `importedFrom: 'gmail'` y saca de la cola |
| `src/components/shared/Breadcrumbs.tsx` | Migas de pan genéricas (reutilizable) |
| `src/tests/mocks/handlers.ts` + `data/gmailIntegration.ts` | Mock MSW de la config |

> **Sin cambios en `firestore.rules`:** al guardar la config como **campo del doc
> `users/{uid}`** (mismo patrón que `userPrefs`), ya queda cubierta por la regla
> existente `allow read, write: if request.auth.uid == uid`. No hace falta declarar
> una colección nueva. Esto cambiará en el slice de la cola de pendientes si se
> decide una subcolección propia.

### El flujo de OAuth en código (`gmailAuth.ts`)

Usa **Google Identity Services (GIS) token client**, no el popup de Firebase, para
poder renovar el token en silencio. Requiere `VITE_GOOGLE_CLIENT_ID` (el OAuth 2.0
Client ID Web del proyecto — el que ya creó Firebase; se ve en Google Cloud →
Credenciales).

```
requestGmailAccess()  (botón Conectar)        ensureGmailToken()  (backend / auto)
  └─ tokenClient.requestAccessToken({prompt:''})   ├─ token en memoria vigente? → usarlo
     • sin popup si el permiso ya está concedido    └─ si no → requestAccessToken({prompt:''})
     • muestra consentimiento solo si hace falta        (renovación silenciosa)
  → guarda access_token + expires_in en memoria
```

- El **consentimiento se guarda en la cuenta de Google**, así que otro dispositivo
  obtiene el token en silencio (sin volver a aceptar).
- `gmailGet` (backend) llama a `ensureGmailToken()` antes de cada request, así el
  token se refresca solo cuando venció.
- El panel, al abrir con la cuenta vinculada, hace un `ensureGmailToken()` silencioso
  para dejar el estado en "Conectado" sin que el usuario toque nada.
- En modo MSW devuelve un token simulado (no llama a Google).

La autorización de Gmail es **independiente del login de la app**: el usuario puede
haber entrado con email/password y aun así conectar su Gmail con este flujo aparte.

---

## 9. Modo desarrollo (MSW)

Nada de esto depende de Google en dev:

- `requestGmailAccess()` devuelve un **token simulado** sin abrir popup.
- La config (`getGmail`/`setGmail`) va contra los handlers MSW en memoria.
- Cuando se implemente el fetch de mails (slice 3), el `IGmailBackend` tendrá su
  versión MSW con **mails mockeados**, así todo el flujo se puede desarrollar y
  probar sin la Gmail API real.

---

## 10. Roadmap

| # | Slice | Estado |
|---|---|---|
| 1 | Sección Integraciones (nav + lista + panel config/sync) | ✅ |
| — | Breadcrumbs reutilizable | ✅ |
| 2 | OAuth real de Gmail (token en memoria) | ✅ |
| — | Persistencia de config en Firestore (cross-device) | ✅ |
| — | Config Google Cloud (consent + scope + usuarios prueba + Gmail API) | ✅ |
| 3 | **Fetch de mails** — `IGmailBackend`: listar por remitentes **+ etiquetas** + ventana + MSW + tests | ✅ |
| 4 | **Parse con Gemini** — `parseEmails()` reusando el patrón de statements, descarta no-transacciones | ✅ |
| 5 | **Cola + vistos** — `gmailQueue` en `users/{uid}`: `pending` + `seenIds` (tope 2000), dedupe, + MSW + tests | ✅ |
| 6 | **Tabla de revisión** — `ImportReviewTable` compartida + `GmailImportModal` (3 estados); modelo `importedFrom: 'gmail'` + `gmailMessageId` | ✅ |
| 7 | **Dedup** — `findBestDuplicate` compartido; los pendientes que matchean un gasto existente muestran "posible duplicado" y arrancan sin tildar | ✅ |
| 8 | **Wire "Sincronizar ahora"** — `syncGmail` orquesta fetch→filtrar vistos→parse→cola→modal + `lastSyncAt` | ✅ |
| — | Reconocer remitentes frecuentes (UX config) | ⬜ Opcional |
| — | Fase 2 (Blaze): sync automático background con refresh token | ⬜ Diferido |

---

## 11. Glosario rápido

- **OAuth Client ID**: identidad de la app ante Google. Firebase ya lo creó para el login.
- **Scope**: permiso puntual que se pide. `gmail.readonly` = leer correo, sin escribir/borrar.
- **Pantalla de consentimiento**: lo que ve el usuario en el popup antes de aceptar.
- **Access token**: credencial de corta vida (~1h) para llamar a la Gmail API. En memoria.
- **Refresh token**: credencial de larga vida para renovar el access token sin intervención. Solo Fase 2, del lado servidor.
- **Modo Testing**: estado de la app OAuth donde solo usuarios de prueba autorizan, sin verificación de Google.
