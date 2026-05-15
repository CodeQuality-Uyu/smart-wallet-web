// src/services/receiptAnalysisService.ts

import type { PendingReceiptExtractedData } from '@/types/models'
import { Currency } from '@/types/enums'

const GEMINI_API_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent'

interface GeminiReceiptResult {
  description?: string
  amount?: number
  currency?: 'USD' | 'UYU'
  date?: string
  confidence: 'high' | 'low' | 'failed'
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

const RECEIPT_PROMPT = `Sos un asistente de finanzas personales. Analizá esta imagen de un comprobante o ticket de compra y extraé la información financiera relevante.

Respondé ÚNICAMENTE con un JSON válido (sin markdown, sin explicaciones) con esta estructura:
{
  "description": "<nombre del comercio o descripción del gasto, en español>",
  "amount": <monto total como número, sin símbolo de moneda>,
  "currency": "<USD o UYU>",
  "date": "<fecha en formato YYYY-MM-DD si se puede leer, sino null>",
  "confidence": "<high si todos los datos son claros, low si alguno es dudoso, failed si no se puede leer nada útil>"
}

Si no podés determinar algún campo con certeza, omitilo del JSON. El campo "confidence" es obligatorio.`

export async function analyzeReceiptImage(imageUrl: string): Promise<PendingReceiptExtractedData> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY as string | undefined
  if (!apiKey) throw new Error('VITE_GEMINI_API_KEY not set')

  const { base64, mimeType } = await imageUrlToBase64(imageUrl)

  const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            { text: RECEIPT_PROMPT },
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

  return {
    description: parsed.description,
    amount: parsed.amount,
    currency: parsed.currency === 'USD' ? Currency.USD : parsed.currency === 'UYU' ? Currency.UYU : undefined,
    date: parsed.date ?? undefined,
    confidence: parsed.confidence,
  }
}
