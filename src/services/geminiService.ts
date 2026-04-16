// src/services/geminiService.ts

import type { Category } from '@/types/models'

export interface CategorySuggestionResult {
  match: string | null // existing category id
  suggestions: NewCategorySuggestion[]
}

export interface NewCategorySuggestion {
  name: string
  icon: string
  color: string
  monthlyLimit?: number
}

const GEMINI_API_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent'

function buildPrompt(expenseName: string, categories: Category[]): string {
  const catList = categories
    .filter((c) => c.active)
    .map((c) => `{ "id": "${c.id}", "name": "${c.name}", "icon": "${c.icon}" }`)
    .join(', ')

  return `Sos un asistente de finanzas personales. Dado el nombre de un gasto, devolvé un JSON con la categoría más adecuada de entre las existentes, o sugerí nuevas categorías si ninguna aplica bien.

Nombre del gasto: "${expenseName}"

Categorías existentes: [${catList}]

Respondé ÚNICAMENTE con un JSON válido (sin markdown, sin explicaciones) con esta estructura:
{
  "match": "<id de la categoría existente más adecuada, o null si ninguna aplica>",
  "suggestions": [
    { "name": "<nombre>", "icon": "<emoji>", "color": "<hex color>", "monthlyLimit": <número opcional> }
  ]
}

Si encontrás una buena coincidencia en las categorías existentes, "match" debe tener el id y "suggestions" puede estar vacío.
Si no hay buena coincidencia, "match" es null y "suggestions" debe tener 1-2 opciones relevantes.`
}

export async function suggestCategory(
  expenseName: string,
  categories: Category[],
): Promise<CategorySuggestionResult> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY as string | undefined
  if (!apiKey) throw new Error('VITE_GEMINI_API_KEY not set')

  const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: buildPrompt(expenseName, categories) }] }],
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
  return JSON.parse(text) as CategorySuggestionResult
}
