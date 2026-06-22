// src/services/statementService.ts
// Parses bank statement PDFs via Gemini Vision and detects duplicate expenses.

import type { StatementLine, StatementImportRow, Expense, Category } from '@/types/models'
import { StatementImportAction } from '@/types/enums'

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY as string | undefined
const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent'

const PARSE_PROMPT = `Analiza este estado de cuenta bancario y extrae todas las líneas de cargos/débitos (gastos).
Para cada transacción devuelve un JSON con este formato exacto:
{
  "lines": [
    {
      "date": "2026-04-15",
      "description": "MERCADOPAGO*UBER",
      "amount": 350.00,
      "currency": "UYU",
      "suggestedCategoryName": "Transporte"
    }
  ]
}

Reglas:
- date: formato ISO YYYY-MM-DD
- amount: número positivo
- currency: "UYU" o "USD" según la moneda del cargo
- suggestedCategoryName: categoría de gasto personal en español (ej: Transporte, Supermercado, Restaurantes, Salud, Servicios, Entretenimiento, Ropa, Electrónica, Otros)
- Solo incluir cargos/compras. Ignorar pagos, abonos y acreditaciones.
- Responder ÚNICAMENTE con el JSON, sin texto adicional ni markdown.`

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i] as number)
  }
  return btoa(binary)
}

export async function parsePdf(file: File): Promise<StatementLine[]> {
  if (!GEMINI_API_KEY) throw new Error('VITE_GEMINI_API_KEY no está configurada')

  const arrayBuffer = await file.arrayBuffer()
  const base64 = arrayBufferToBase64(arrayBuffer)

  const response = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [
          { text: PARSE_PROMPT },
          { inlineData: { mimeType: 'application/pdf', data: base64 } },
        ],
      }],
    }),
  })

  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.status}`)
  }

  const data = await response.json() as {
    candidates?: { content?: { parts?: { text?: string }[] } }[]
  }
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
  const clean = text.replace(/```json|```/g, '').trim()

  let parsed: { lines?: StatementLine[] }
  try {
    parsed = JSON.parse(clean) as { lines?: StatementLine[] }
  } catch {
    throw new Error('No se pudo interpretar la respuesta de Gemini')
  }

  return parsed.lines ?? []
}

export async function parsePdfFromUrl(url: string): Promise<StatementLine[]> {
  const response = await fetch(url)
  if (!response.ok) throw new Error('No se pudo descargar el documento')
  const blob = await response.blob()
  const file = new File([blob], 'statement.pdf', { type: 'application/pdf' })
  return parsePdf(file)
}

function levenshteinSimilarity(a: string, b: string): number {
  const al = a.toLowerCase()
  const bl = b.toLowerCase()
  if (al === bl) return 1
  if (al.includes(bl) || bl.includes(al)) return 0.7
  const words = al.split(/\s+/)
  const bWords = bl.split(/\s+/)
  const matches = words.filter((w) => bWords.some((bw) => bw.includes(w) || w.includes(bw)))
  return matches.length / Math.max(words.length, bWords.length)
}

export function detectDuplicates(
  lines: StatementLine[],
  existingExpenses: Expense[],
  defaultCardId: string,
  categories: Category[],
): StatementImportRow[] {
  return lines.map((line): StatementImportRow => {
    let bestMatch: { expenseId: string; score: number } | null = null

    for (const expense of existingExpenses) {
      if (expense.amount !== line.amount) continue
      if (expense.currency !== line.currency) continue

      const lineDate = new Date(line.date)
      const expDate = new Date(expense.date)
      const daysDiff = Math.abs((lineDate.getTime() - expDate.getTime()) / 86_400_000)
      if (daysDiff > 2) continue

      const datScore = daysDiff === 0 ? 0.3 : daysDiff === 1 ? 0.2 : 0.1
      const descScore = levenshteinSimilarity(line.description, expense.description) * 0.2
      const score = 0.5 + datScore + descScore

      if (!bestMatch || score > bestMatch.score) {
        bestMatch = { expenseId: expense.id, score }
      }
    }

    const matchedCategory = line.suggestedCategoryName
      ? categories.find((c) =>
          c.name.toLowerCase().includes(line.suggestedCategoryName!.toLowerCase()) ||
          line.suggestedCategoryName!.toLowerCase().includes(c.name.toLowerCase()),
        )
      : undefined

    return {
      ...line,
      rowId: crypto.randomUUID(),
      action: StatementImportAction.Import,
      cardId: defaultCardId,
      categoryId: matchedCategory?.id,
      ...(bestMatch && bestMatch.score > 0.6
        ? { matchedExpenseId: bestMatch.expenseId, matchScore: bestMatch.score }
        : {}),
    }
  })
}
