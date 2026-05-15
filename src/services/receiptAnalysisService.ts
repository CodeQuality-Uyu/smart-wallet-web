// src/services/receiptAnalysisService.ts

import type { PendingReceiptExtractedData } from '@/types/models'
import { Currency } from '@/types/enums'

const GEMINI_API_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent'

interface CategoryLike { id: string; name: string }
interface PlaceLike    { id: string; name: string }

interface GeminiReceiptResult {
  description?: string
  amount?: number
  currency?: 'USD' | 'UYU'
  date?: string
  placeName?: string
  categoryNames?: string[]
  confidence: 'high' | 'low' | 'failed'
}

export interface ReceiptAnalysisContext {
  categories: CategoryLike[]
  places: PlaceLike[]
}

async function imageUrlToBase64(imageUrl: string): Promise<{ base64: string; mimeType: string }> {
  const response = await fetch(imageUrl)
  const blob = await response.blob()
  const mimeType = blob.type || 'image/jpeg'
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result as string
      const base64 = dataUrl.split(',')[1] ?? ''
      resolve({ base64, mimeType })
    }
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

function buildPrompt(ctx: ReceiptAnalysisContext): string {
  const catList = ctx.categories.map((c) => `{"id":"${c.id}","name":"${c.name}"}`).join(', ')
  const placeList = ctx.places.map((p) => `{"id":"${p.id}","name":"${p.name}"}`).join(', ')

  return `Sos un asistente de finanzas personales. Analizá esta imagen de un comprobante o ticket de compra y extraé la información financiera relevante.

Categorías del usuario: [${catList}]
Locales del usuario: [${placeList}]

Respondé ÚNICAMENTE con un JSON válido (sin markdown, sin explicaciones) con esta estructura:
{
  "description": "<nombre del comercio o descripción breve del gasto>",
  "amount": <monto total como número, sin símbolo de moneda>,
  "currency": "<USD o UYU>",
  "date": "<fecha en formato YYYY-MM-DD si se puede leer, sino omitir>",
  "placeName": "<nombre del local tal como aparece en el comprobante>",
  "categoryNames": ["<nombre de categoría 1>", "<nombre de categoría 2>"],
  "confidence": "<high si todos los datos clave son claros, low si alguno es dudoso, failed si no se puede leer nada útil>"
}

Reglas:
- En "categoryNames" incluí los nombres de las categorías del usuario que mejor correspondan al gasto (1 o 2 máximo). Si ninguna aplica, sugerí un nombre nuevo descriptivo.
- En "placeName" usá el nombre exacto del local del comprobante. Si coincide aproximadamente con alguno de los locales del usuario, usá ese nombre.
- Si no podés determinar un campo, omitilo. "confidence" es obligatorio.`
}

function resolveIds(
  result: GeminiReceiptResult,
  ctx: ReceiptAnalysisContext,
): Pick<PendingReceiptExtractedData, 'placeId' | 'categoryIds' | 'suggestedPlaceName' | 'suggestedCategoryNames'> {
  // Resolve place: fuzzy match by name (lowercase includes)
  let placeId: string | undefined
  let suggestedPlaceName: string | undefined
  if (result.placeName) {
    const nameLower = result.placeName.toLowerCase()
    const match = ctx.places.find((p) => p.name.toLowerCase().includes(nameLower) || nameLower.includes(p.name.toLowerCase()))
    if (match) {
      placeId = match.id
    } else {
      suggestedPlaceName = result.placeName
    }
  }

  // Resolve categories: match by name
  const categoryIds: string[] = []
  const suggestedCategoryNames: string[] = []
  for (const catName of result.categoryNames ?? []) {
    const nameLower = catName.toLowerCase()
    const match = ctx.categories.find((c) => c.name.toLowerCase().includes(nameLower) || nameLower.includes(c.name.toLowerCase()))
    if (match) {
      categoryIds.push(match.id)
    } else {
      suggestedCategoryNames.push(catName)
    }
  }

  return {
    ...(placeId ? { placeId } : {}),
    ...(suggestedPlaceName ? { suggestedPlaceName } : {}),
    ...(categoryIds.length > 0 ? { categoryIds } : {}),
    ...(suggestedCategoryNames.length > 0 ? { suggestedCategoryNames } : {}),
  }
}

export async function analyzeReceiptImage(
  imageUrl: string,
  ctx: ReceiptAnalysisContext,
): Promise<PendingReceiptExtractedData> {
  const apiKey = (import.meta.env.VITE_GEMINI_API_KEY as string | undefined) ?? 'mock-key'

  const { base64, mimeType } = await imageUrlToBase64(imageUrl)

  const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            { text: buildPrompt(ctx) },
            { inlineData: { mimeType, data: base64 } },
          ],
        },
      ],
      generationConfig: { responseMimeType: 'application/json' },
    }),
  })

  if (!response.ok) throw new Error(`Gemini API error: ${response.status}`)

  const data = (await response.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[]
  }

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
  const parsed = JSON.parse(text) as GeminiReceiptResult

  const resolved = resolveIds(parsed, ctx)

  return {
    description: parsed.description,
    amount: parsed.amount,
    currency: parsed.currency === 'USD' ? Currency.USD : parsed.currency === 'UYU' ? Currency.UYU : undefined,
    date: parsed.date,
    confidence: parsed.confidence,
    ...resolved,
  }
}
