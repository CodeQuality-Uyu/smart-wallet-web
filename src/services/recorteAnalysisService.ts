// src/services/recorteAnalysisService.ts
// Integración Gemini para recortes:
//  (1) draftRecorte — diseña el indicador a partir del prompt del usuario.
//  (2) computeRecorte — calcula el resultado usando FUNCTION CALLING: Gemini pide
//      los datos que necesita llamando funciones (ver recorteTools.ts) en vez de
//      recibir un contexto fijo. Deshabilitado en modo MSW (solo Firestore real).
//  (3) getRecorteData — snapshot + muestra para el panel de auditoría (sin IA).

import { activeBackend } from '@/backend'
import { periodLabel } from '@/features/recortes/recorteConstants'
import {
  loadRecorteBundle,
  executeRecorteTool,
  RECORTE_FUNCTION_DECLARATIONS,
} from '@/services/recorteTools'
import type { RecorteBundle, RecorteSampleItem } from '@/services/recorteTools'
import { Currency, RecorteOutputFormat, RecorteBadgeLevel } from '@/types/enums'
import type {
  Recorte,
  RecorteResult,
  RecorteResultItem,
  RecorteBadge,
  RecorteDataSnapshot,
} from '@/types/models'

const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent'

/** Máximo de vueltas de tool-calling antes de rendirse (backstop anti-loop). */
const MAX_TOOL_TURNS = 6

// ─── Draft / preview (una sola llamada, sin tools) ────────

export interface RecorteDraft {
  name: string
  description: string
  icon: string
  color: string
  outputFormat: RecorteOutputFormat
}

const OUTPUT_FORMAT_VALUES = Object.values(RecorteOutputFormat) as string[]

function coerceOutputFormat(value: unknown): RecorteOutputFormat {
  return OUTPUT_FORMAT_VALUES.includes(value as string)
    ? (value as RecorteOutputFormat)
    : RecorteOutputFormat.Text
}

async function callGeminiJson(prompt: string): Promise<Record<string, unknown>> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY as string | undefined
  if (!apiKey) throw new Error('VITE_GEMINI_API_KEY no está configurada')

  const response = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: 'application/json' },
    }),
  })
  if (!response.ok) throw new Error(`Gemini API error: ${response.status}`)

  const data = (await response.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[]
  }
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
  const clean = text.replace(/```json|```/g, '').trim()
  try {
    return JSON.parse(clean) as Record<string, unknown>
  } catch {
    throw new Error('No se pudo interpretar la respuesta de Gemini')
  }
}

export async function draftRecorte(userPrompt: string): Promise<RecorteDraft> {
  const prompt = `Diseñá un indicador de recorte de gastos personales a partir de la idea del usuario.

Idea del usuario: "${userPrompt}"

Devolvé ÚNICAMENTE un JSON válido (sin markdown) con esta estructura exacta:
{
  "name": "nombre corto y claro del indicador (máx 4 palabras)",
  "description": "una frase que explique qué mide este indicador",
  "icon": "un solo emoji representativo",
  "color": "un color hex (ej. #ff7043)",
  "outputFormat": "uno de: amount | text | list | badge"
}

Elegí "outputFormat" según lo que pida el usuario: "amount" si espera un número/monto, "list" si espera varios ítems, "badge" si espera un estado/semáforo, "text" para un análisis en palabras.`

  const raw = await callGeminiJson(prompt)
  return {
    name: typeof raw['name'] === 'string' ? (raw['name'] as string) : 'Nuevo recorte',
    description: typeof raw['description'] === 'string' ? (raw['description'] as string) : '',
    icon: typeof raw['icon'] === 'string' ? (raw['icon'] as string) : '✂️',
    color: typeof raw['color'] === 'string' ? (raw['color'] as string) : '#4caf50',
    outputFormat: coerceOutputFormat(raw['outputFormat']),
  }
}

// ─── Panel de auditoría (sin IA) ──────────────────────────

export async function getRecorteData(
  recorte: Recorte,
): Promise<{ snapshot: RecorteDataSnapshot; sample: RecorteSampleItem[] }> {
  const bundle = await loadRecorteBundle(recorte)
  return { snapshot: bundle.snapshot, sample: bundle.sample }
}

// ─── Compute vía function calling ─────────────────────────

interface GeminiFunctionCall {
  id?: string
  name: string
  args?: Record<string, unknown>
}
interface GeminiPart {
  text?: string
  functionCall?: GeminiFunctionCall
  functionResponse?: unknown
}
interface GeminiContent {
  role: 'user' | 'model'
  parts: GeminiPart[]
}

async function geminiToolTurn(contents: GeminiContent[]): Promise<GeminiPart[]> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY as string | undefined
  if (!apiKey) throw new Error('VITE_GEMINI_API_KEY no está configurada')

  const response = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents,
      tools: [{ functionDeclarations: RECORTE_FUNCTION_DECLARATIONS }],
      toolConfig: { functionCallingConfig: { mode: 'AUTO' } },
      // temperature 0: dado el mismo estado de datos, mismo resultado.
      generationConfig: { temperature: 0 },
    }),
  })
  if (!response.ok) throw new Error(`Gemini API error: ${response.status}`)

  const data = (await response.json()) as {
    candidates?: { content?: { parts?: GeminiPart[] } }[]
  }
  return data.candidates?.[0]?.content?.parts ?? []
}

function formatSchema(format: RecorteOutputFormat): string {
  switch (format) {
    case RecorteOutputFormat.Amount:
      return `{ "amount": <número>, "currency": "UYU" | "USD", "text": "una frase de contexto (opcional)" }`
    case RecorteOutputFormat.List:
      return `{ "items": [ { "label": "título del hallazgo", "detail": "explicación corta", "amount": <número opcional>, "currency": "UYU" | "USD" (opcional) } ] }`
    case RecorteOutputFormat.Badge:
      return `{ "badge": { "level": "good" | "warning" | "alert", "label": "estado corto" }, "text": "una frase que lo explique" }`
    case RecorteOutputFormat.Text:
    default:
      return `{ "text": "un párrafo corto, informal (tuteo con 'vos'), directo y concreto" }`
  }
}

function coerceCurrency(value: unknown): Currency | undefined {
  return value === Currency.USD || value === Currency.UYU ? (value as Currency) : undefined
}

function coerceItems(value: unknown): RecorteResultItem[] | undefined {
  if (!Array.isArray(value)) return undefined
  return value
    .filter((it): it is Record<string, unknown> => typeof it === 'object' && it !== null)
    .map((it) => ({
      label: typeof it['label'] === 'string' ? (it['label'] as string) : '',
      detail: typeof it['detail'] === 'string' ? (it['detail'] as string) : undefined,
      amount: typeof it['amount'] === 'number' ? (it['amount'] as number) : undefined,
      currency: coerceCurrency(it['currency']),
    }))
    .filter((it) => it.label.length > 0)
}

function coerceBadge(value: unknown): RecorteBadge | undefined {
  if (typeof value !== 'object' || value === null) return undefined
  const raw = value as Record<string, unknown>
  const levels = Object.values(RecorteBadgeLevel) as string[]
  const level = levels.includes(raw['level'] as string)
    ? (raw['level'] as RecorteBadgeLevel)
    : RecorteBadgeLevel.Warning
  return { level, label: typeof raw['label'] === 'string' ? (raw['label'] as string) : '' }
}

function buildSystemPrompt(recorte: Recorte, bundle: RecorteBundle): string {
  const scoped = bundle.snapshot.scopeCategories?.length
    ? `Este recorte está ACOTADO a estas categorías: ${bundle.snapshot.scopeCategories.join(', ')}. Las funciones ya devuelven solo esos datos.\n`
    : ''

  return `Sos un asistente de finanzas personales. Calculá el resultado del indicador de recorte descrito, consultando los datos con las funciones disponibles.

Consigna del usuario: "${recorte.prompt}"
Período: ${periodLabel(recorte)}
${scoped}
Cómo trabajar:
- Usá las funciones para OBTENER los datos; no inventes números ni nombres.
- Para montos TOTALES usá spend_total (es exacto y coincide con Métricas). Para LOCALES usá spend_by_place. Para desglose por categoría de gasto, spend_by_category. Para ejemplos o detalle, list_expenses.
- Para PRODUCTOS y sus categorías (ej. Lácteos, Limpieza) usá spend_by_product_category (exacto), list_product_categories, list_products y list_ticket_lines (ítems de cada compra). No confundas categorías de gasto con categorías de producto.
- Las monedas UYU y USD nunca se mezclan en un mismo número.
- Cada texto debe ser autoconclusivo: si mencionás un monto, escribilo completo dentro de la frase.
- Tono informal (tuteo con 'vos'), concreto y directo.

Cuando tengas los datos, respondé el resultado final ÚNICAMENTE como JSON válido (sin markdown) con esta estructura exacta:
${formatSchema(recorte.outputFormat)}`
}

/** Calcula el resultado de un recorte vía function calling. Devuelve el resultado sin `id`. */
export async function computeRecorte(recorte: Recorte): Promise<Omit<RecorteResult, 'id'>> {
  if (activeBackend === 'msw') {
    throw new Error('El análisis con IA no está disponible en modo desarrollo (MSW). Usá el backend real.')
  }

  const bundle = await loadRecorteBundle(recorte)
  const label = periodLabel(recorte)

  const contents: GeminiContent[] = [{ role: 'user', parts: [{ text: buildSystemPrompt(recorte, bundle) }] }]
  let finalText: string | null = null

  for (let turn = 0; turn < MAX_TOOL_TURNS; turn++) {
    const parts = await geminiToolTurn(contents)
    const calls = parts.filter(
      (p): p is GeminiPart & { functionCall: GeminiFunctionCall } => Boolean(p.functionCall),
    )
    if (calls.length === 0) {
      finalText = parts.map((p) => p.text ?? '').join('').trim()
      break
    }
    // Adjuntamos el turno del modelo (con los functionCall) y le respondemos cada uno.
    contents.push({ role: 'model', parts })
    contents.push({
      role: 'user',
      parts: calls.map((p) => ({
        functionResponse: {
          name: p.functionCall.name,
          ...(p.functionCall.id ? { id: p.functionCall.id } : {}),
          response: executeRecorteTool(p.functionCall.name, p.functionCall.args ?? {}, bundle),
        },
      })),
    })
  }

  if (!finalText) {
    throw new Error('La IA no devolvió un resultado (se agotaron los pasos de consulta).')
  }

  const clean = finalText.replace(/```json|```/g, '').trim()
  let raw: unknown
  try {
    raw = JSON.parse(clean)
  } catch {
    throw new Error('No se pudo interpretar la respuesta de Gemini')
  }

  // Formatos objeto (amount/badge/text): si vino un array `[{...}]`, tomamos el primero.
  const objSrc = Array.isArray(raw) ? raw[0] : raw
  const obj: Record<string, unknown> =
    objSrc && typeof objSrc === 'object' ? (objSrc as Record<string, unknown>) : {}

  const result: Omit<RecorteResult, 'id'> = {
    generatedAt: new Date().toISOString(),
    periodLabel: label,
    dataSnapshot: bundle.snapshot,
  }

  switch (recorte.outputFormat) {
    case RecorteOutputFormat.Amount:
      if (typeof obj['amount'] === 'number') result.amount = obj['amount'] as number
      result.currency = coerceCurrency(obj['currency']) ?? Currency.UYU
      if (typeof obj['text'] === 'string') result.text = obj['text'] as string
      break
    case RecorteOutputFormat.List:
      // Para lista, un array de nivel superior ES la lista de ítems.
      result.items = coerceItems(Array.isArray(raw) ? raw : obj['items']) ?? []
      break
    case RecorteOutputFormat.Badge:
      result.badge = coerceBadge(obj['badge'])
      if (typeof obj['text'] === 'string') result.text = obj['text'] as string
      break
    case RecorteOutputFormat.Text:
    default:
      result.text = typeof obj['text'] === 'string' ? (obj['text'] as string) : ''
      break
  }

  return result
}
