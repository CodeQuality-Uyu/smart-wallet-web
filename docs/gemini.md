# Gemini AI — Integración en SmartWallet

## ¿Qué es Gemini?

Gemini es el modelo de lenguaje de Google. SmartWallet usa la API REST de Gemini directamente desde el frontend (sin backend intermedio) para tareas de inferencia ligera sobre los datos del usuario.

**Modelo en uso:** `gemini-2.5-flash` — optimizado para respuestas rápidas, tier gratuito con rate limits generosos, ideal para features en tiempo real.

---

## Capacidades actuales en el proyecto

### Sugerencia de categoría al crear un gasto

Cuando el usuario escribe el nombre de un gasto en `NewExpensePage`, se llama a Gemini con el nombre del gasto y la lista de categorías existentes del usuario. Gemini devuelve:

- **`match`**: el `id` de la categoría existente más adecuada (o `null` si ninguna aplica)
- **`suggestions`**: 1-2 nuevas categorías propuestas si no hay buena coincidencia, con nombre, emoji, color hex y límite mensual sugerido

**Archivos relevantes:**
- `src/services/geminiService.ts` — cliente HTTP + construcción del prompt
- `src/features/expenses/hooks/useCategorySuggestion.ts` — hook con debounce (500ms) y caché React Query (5min)
- `src/features/expenses/components/CategorySuggestionBanner.tsx` — UI del chip de sugerencia

**Comportamiento:**
- La llamada se dispara solo si el nombre tiene ≥ 3 caracteres
- Usa `staleTime: 5min` → mismo texto no relanza la llamada
- Si `VITE_GEMINI_API_KEY` no está configurado, lanza error silencioso (el banner no aparece)
- En modo MSW (`VITE_BACKEND=msw`) la llamada está mockeada en `src/tests/mocks/handlers.ts`

---

## Capacidades potenciales (no implementadas)

Gemini puede aportar valor en otras áreas del proyecto con el mismo patrón de integración:

| Idea | Descripción |
|---|---|
| **Tips dinámicos** | Generar sugerencias contextuales basadas en métricas reales del usuario (ej: "Gastaste 23% más en restaurantes este mes") |
| **Detección de duplicados** | Al registrar un gasto, detectar si ya existe uno similar reciente |
| **Categorización automática de recurrentes** | Sugerir categoría al crear un pago recurrente nuevo |
| **Resumen mensual en lenguaje natural** | Generar un párrafo de resumen del mes para los cierres |
| **Sugerencia de límite de presupuesto** | Proponer límites mensuales por categoría basándose en el historial |

Todos estos casos siguen el mismo patrón: prompt estructurado → JSON estricto como respuesta.

---

## Tokens y pricing

### ¿Qué es un token?

Un token es la unidad mínima de texto que procesa el modelo. Aproximadamente:
- **1 token ≈ 4 caracteres** en inglés / ~3 caracteres en español
- **1 token ≈ ¾ de una palabra**
- Una oración corta como "Compra en el supermercado" son ~6 tokens

Cada llamada consume tokens de **entrada** (el prompt que enviás) y tokens de **salida** (la respuesta del modelo).

### Estimación de tokens por llamada en SmartWallet

El prompt de sugerencia de categoría incluye el nombre del gasto + la lista de categorías del usuario:

| Componente | Tokens aprox. |
|---|---|
| Instrucciones del sistema (fijas) | ~120 tokens |
| Nombre del gasto | 3–10 tokens |
| Lista de categorías (10 categorías) | ~80 tokens |
| **Total input por llamada** | **~200–210 tokens** |
| Respuesta JSON (match + suggestions) | ~60–80 tokens |
| **Total output por llamada** | **~70 tokens** |

> Para un usuario con 20 categorías y uso intensivo (50 sugerencias/mes), el costo mensual estimado es < **$0.01 USD**.

### Modelos disponibles y precios

> Fuente: [ai.google.dev/gemini-api/docs/pricing](https://ai.google.dev/gemini-api/docs/pricing)

#### Tier gratuito (Free)

| Modelo | Input | Output | Límite |
|---|---|---|---|
| `gemini-2.5-flash` | Gratis | Gratis | Rate limits aplicados |
| `gemini-2.5-flash-lite` | Gratis | Gratis | Rate limits aplicados |
| `gemini-3-flash-preview` | Gratis | Gratis | Rate limits aplicados |

#### Tier pago (por millón de tokens)

| Modelo | Input (texto/imagen) | Input (audio) | Output |
|---|---|---|---|
| `gemini-2.5-flash` | $0.30 | $1.00 | $2.50 |
| `gemini-2.0-flash` ⚠️ | $0.10 | $0.70 | $0.40 |

> ⚠️ **`gemini-2.0-flash` está deprecado** y se dará de baja el **1 de junio de 2026**. Se recomienda migrar a `gemini-2.5-flash` antes de esa fecha. Ver sección [Migración a 2.5 Flash](#migración-a-gemini-25-flash).

#### Reducción de costos disponibles

- **Batch API**: 50% de descuento en el tier pago (procesamiento asíncrono, no aplica para features en tiempo real)
- **Context caching**: precio reducido si se repite el mismo contexto largo en múltiples llamadas (no aplica en el uso actual)

### Context window

| Modelo | Tokens de contexto máx. |
|---|---|
| `gemini-2.5-flash` | 1,000,000 tokens |
| `gemini-2.0-flash` | 1,000,000 tokens |

El contexto window define cuánto texto puede procesar el modelo en una sola llamada. Para los prompts de SmartWallet (< 300 tokens), esto no es una restricción en absoluto.

### Migración a Gemini 2.5 Flash

Para migrar antes del cierre de `gemini-2.0-flash` (1 jun 2026), cambiar una sola línea en `src/services/geminiService.ts`:

```ts
// Antes
const GEMINI_API_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent'

// Después
const GEMINI_API_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent'
```

`gemini-2.5-flash` es más capaz y sigue siendo gratuito en el tier free, por lo que no hay impacto en costo para uso personal.

---

## Configuración

### 1. Obtener una API key

1. Ir a [Google AI Studio](https://aistudio.google.com)
2. Iniciar sesión con una cuenta Google
3. Crear una nueva API key (sección **Get API key**)
4. Copiar la key generada

> La tier gratuita de Gemini 2.0 Flash tiene límites generosos (60 requests/min, sin costo). Para producción con volumen alto, revisar los precios en Google AI Studio.

### 2. Configurar la variable de entorno

En el archivo `.env.local` (copiado desde `.env.example`):

```env
VITE_GEMINI_API_KEY=AIzaSy...tu_key_aqui
```

> **Importante:** El prefijo `VITE_` es obligatorio para que Vite exponga la variable al frontend. Sin él, `import.meta.env.VITE_GEMINI_API_KEY` devuelve `undefined`.

### 3. Verificar que funciona

1. Levantar el proyecto con `npm run dev`
2. Ir a **Nuevo gasto**
3. Escribir un nombre con ≥ 3 caracteres (ej: "supermercado")
4. Esperar ~500ms — debe aparecer el banner de sugerencia debajo del campo

Si no aparece, verificar en la consola del navegador si hay errores de red o `VITE_GEMINI_API_KEY not set`.

---

## Cómo funciona internamente

```
Usuario escribe → debounce 500ms → useCategorySuggestion
  → React Query (cache 5min por texto)
    → suggestCategory(expenseName, categories)
      → POST https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent
        → { contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseMimeType: "application/json" } }
          → Gemini responde JSON puro
            → parse → CategorySuggestionResult
              → CategorySuggestionBanner muestra la sugerencia
```

### Por qué `responseMimeType: "application/json"`

Forzar este MIME type le indica a Gemini que debe responder JSON válido y nada más. Evita que agregue texto explicativo, markdown o bloques de código alrededor del JSON, lo que rompería el `JSON.parse`.

---

## Modo desarrollo (MSW)

Con `VITE_BACKEND=msw`, el handler en `src/tests/mocks/handlers.ts` intercepta las llamadas a la URL de Gemini y devuelve respuestas predefinidas. Esto permite desarrollar y testear el feature sin consumir cuota de la API ni necesitar la key configurada.

---

## Seguridad

- La API key queda expuesta en el bundle del frontend (es una limitación del patrón client-side). Esto es aceptable para un proyecto de uso personal/familiar.
- Para un producto público, lo correcto sería proxear la llamada a través de una Cloud Function o backend propio que nunca exponga la key al cliente.
- Restringir la key en Google Cloud Console a los dominios autorizados (ej: el dominio de Firebase Hosting del proyecto).
