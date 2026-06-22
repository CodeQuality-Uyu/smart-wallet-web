// src/services/geminiService.ts

export interface CategorySuggestionResult {
  matches: string[] // existing category ids (up to 3)
  suggestions: NewCategorySuggestion[]
}

export interface NewCategorySuggestion {
  name: string
  icon: string
  color: string
  monthlyLimit?: number
}

interface CategoryLike {
  id: string
  name: string
  icon: string
}

const GEMINI_API_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent'

function buildPrompt(entityName: string, entityLabel: string, categories: CategoryLike[]): string {
  const catList = categories
    .map((c) => `{ "id": "${c.id}", "name": "${c.name}", "icon": "${c.icon}" }`)
    .join(', ')

  return `Sos un asistente de finanzas personales. Dado el nombre de un ${entityLabel}, devolvé un JSON con las categorías más adecuadas de entre las existentes, o sugerí nuevas categorías si ninguna aplica bien.

Nombre del ${entityLabel}: "${entityName}"

Categorías existentes: [${catList}]

Respondé ÚNICAMENTE con un JSON válido (sin markdown, sin explicaciones) con esta estructura:
{
  "matches": ["<id1>", "<id2>"],
  "suggestions": [
    { "name": "<nombre>", "icon": "<emoji>", "color": "<hex color>", "monthlyLimit": <número opcional> }
  ]
}

Devolvé en "matches" hasta 3 ids de categorías existentes que sean relevantes (ordenadas de más a menos relevante). Si ninguna aplica, devolvé "matches" vacío y en "suggestions" 1-3 categorías nuevas propuestas.`
}

async function callGemini(prompt: string): Promise<CategorySuggestionResult> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY as string | undefined
  if (!apiKey) {
    console.warn('[gemini] VITE_GEMINI_API_KEY no está configurada — sugerencias deshabilitadas')
    throw new Error('VITE_GEMINI_API_KEY not set')
  }

  const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: 'application/json' },
    }),
  })

  if (!response.ok) {
    const detail = await response.text().catch(() => '')
    console.error(`[gemini] API error ${response.status}:`, detail)
    throw new Error(`Gemini API error: ${response.status}`)
  }

  const data = (await response.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[]
  }

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
  try {
    return JSON.parse(text) as CategorySuggestionResult
  } catch {
    console.error('[gemini] respuesta no es JSON válido:', text)
    throw new Error('Gemini returned invalid JSON')
  }
}

export function suggestCategory(
  expenseName: string,
  categories: CategoryLike[],
): Promise<CategorySuggestionResult> {
  return callGemini(buildPrompt(expenseName, 'gasto', categories))
}

export function suggestProductCategory(
  productName: string,
  categories: CategoryLike[],
): Promise<CategorySuggestionResult> {
  return callGemini(buildPrompt(productName, 'producto', categories))
}
