// src/services/gmailParseService.ts
// Convierte mails de aviso de compra en gastos candidatos usando Gemini.
// Mismo patrón que statementService.parsePdf: se llama a Gemini por fetch y en
// modo MSW el handler intercepta la URL y devuelve una respuesta mock.

import { appConfig } from '@/app/config'
import { Currency } from '@/types/enums'
import type { GmailRawMessage, GmailParsedLine } from '@/types/models'

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY as string | undefined
const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent'

// Marcador estable que el handler MSW usa para reconocer este prompt.
const PARSE_MARKER = 'avisos de compra recibidos por email'

// Se recorta el cuerpo para no inflar el prompt (los avisos son cortos).
const MAX_BODY_CHARS = 2000

/** Arma el prompt con los emails embebidos como JSON. Exportado para tests. */
export function buildEmailParsePrompt(messages: GmailRawMessage[]): string {
  const emails = messages.map((m) => ({
    id: m.id,
    from: m.from,
    subject: m.subject,
    date: m.date,
    body: m.body.slice(0, MAX_BODY_CHARS),
  }))

  return `Sos un asistente de finanzas personales. Te paso una lista de ${PARSE_MARKER} (de bancos/tarjetas). Extraé SOLO los que sean una compra, consumo o cargo real y devolvé una línea por cada uno.

Emails: ${JSON.stringify(emails)}

Respondé ÚNICAMENTE con un JSON válido (sin markdown ni explicaciones) con esta estructura:
{
  "lines": [
    { "gmailMessageId": "<id del email>", "date": "2026-07-19", "description": "<comercio o descripción>", "amount": 1234.00, "currency": "UYU", "suggestedCategoryName": "Supermercado" }
  ]
}

Reglas:
- Incluí solo compras/consumos/cargos reales. IGNORÁ promociones, resúmenes de cuenta, alertas de saldo, avisos de vencimiento y reversos/anulaciones.
- gmailMessageId: el "id" EXACTO del email del que sale la línea.
- date: formato ISO YYYY-MM-DD (deducila del cuerpo o de la fecha del email).
- amount: número positivo.
- currency: "UYU" o "USD" según la moneda (U$S o US$ = USD; $ = UYU).
- suggestedCategoryName: categoría de gasto personal en español (ej: Transporte, Supermercado, Restaurantes, Salud, Servicios, Entretenimiento, Ropa, Otros).`
}

/** Línea parseada por Gemini, antes de adjuntarle el remitente (`from`). */
type ParsedLineCore = Omit<GmailParsedLine, 'from'>

/** Parsea la respuesta de Gemini a líneas válidas. Descarta lo que no cierra. Exportado para tests. */
export function parseGeminiEmailResponse(text: string): ParsedLineCore[] {
  const clean = text.replace(/```json|```/g, '').trim()

  let parsed: { lines?: unknown }
  try {
    parsed = JSON.parse(clean) as { lines?: unknown }
  } catch {
    throw new Error('No se pudo interpretar la respuesta de Gemini')
  }

  const raw = Array.isArray(parsed.lines) ? parsed.lines : []
  const lines: ParsedLineCore[] = []

  for (const item of raw) {
    if (typeof item !== 'object' || item === null) continue
    const o = item as Record<string, unknown>
    const gmailMessageId = typeof o.gmailMessageId === 'string' ? o.gmailMessageId : ''
    const description = typeof o.description === 'string' ? o.description.trim() : ''
    const amount = typeof o.amount === 'number' ? o.amount : Number(o.amount)
    const currency = o.currency === 'USD' ? Currency.USD : o.currency === 'UYU' ? Currency.UYU : null
    const date = typeof o.date === 'string' ? o.date : ''

    if (!gmailMessageId || !description || !currency) continue
    if (!Number.isFinite(amount) || amount <= 0) continue

    lines.push({
      gmailMessageId,
      date,
      description,
      amount,
      currency,
      suggestedCategoryName:
        typeof o.suggestedCategoryName === 'string' ? o.suggestedCategoryName : undefined,
    })
  }

  return lines
}

/** Llama a Gemini y devuelve los gastos candidatos extraídos de los mails. */
export async function parseEmails(messages: GmailRawMessage[]): Promise<GmailParsedLine[]> {
  if (messages.length === 0) return []

  // En modo MSW el handler intercepta la URL igual sin key real; en prod la key es obligatoria.
  const key = GEMINI_API_KEY ?? (appConfig.backend === 'firestore' ? undefined : 'msw-mock')
  if (!key) throw new Error('VITE_GEMINI_API_KEY no está configurada')

  const response = await fetch(`${GEMINI_URL}?key=${key}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: buildEmailParsePrompt(messages) }] }],
      generationConfig: { responseMimeType: 'application/json' },
    }),
  })

  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.status}`)
  }

  const data = (await response.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[]
  }
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
  const core = parseGeminiEmailResponse(text)

  // Adjunta el remitente (`from`) de cada mail de origen, por gmailMessageId.
  const fromById = new Map(messages.map((m) => [m.id, m.from]))
  return core.map((line) => ({ ...line, from: fromById.get(line.gmailMessageId) ?? '' }))
}
