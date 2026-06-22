// src/services/monthAnalysisService.ts
// Generates and persists AI-powered monthly spending analysis via Gemini.

import { getMonthAnalysisBackend } from '@/backend'
import type { MonthAnalysis, MetricsSummary } from '@/types/models'

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY as string | undefined
const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent'

function buildPrompt(yearMonth: string, metrics: MetricsSummary): string {
  const topCats = metrics.byCategory
    .slice(0, 6)
    .map((c) => `  - ${c.categoryIcon} ${c.categoryName}: $${c.uyu.toFixed(0)} UYU / U$S${c.usd.toFixed(0)} USD (${c.expenseCount} gastos)`)
    .join('\n')

  const prevDiffUyu =
    metrics.previousPeriodUyu > 0
      ? Math.round(((metrics.totalUyu - metrics.previousPeriodUyu) / metrics.previousPeriodUyu) * 100)
      : null

  const comparisonLine =
    prevDiffUyu !== null
      ? `Comparado con el mes anterior: ${prevDiffUyu > 0 ? '+' : ''}${prevDiffUyu}% en UYU`
      : 'Sin datos del mes anterior para comparar'

  return `Hacé un análisis mensual de gastos personales para ${yearMonth}.

Datos del mes:
- Total gastado: $${metrics.totalUyu.toFixed(0)} UYU / U$S${metrics.totalUsd.toFixed(0)} USD
- Gastos variables: $${metrics.variableUyu.toFixed(0)} UYU / U$S${metrics.variableUsd.toFixed(0)} USD
- Gastos fijos (recurrentes): $${metrics.fixedUyu.toFixed(0)} UYU / U$S${metrics.fixedUsd.toFixed(0)} USD
- ${comparisonLine}
- Top categorías:
${topCats}

Respondé ÚNICAMENTE con un JSON válido (sin markdown) con este formato exacto:
{
  "summary": "Párrafo corto e informal (tuteo, vos) contando en qué se fue la plata este mes.",
  "unnecessary": {
    "insights": [{ "category": "nombre", "insight": "explicación corta e informal" }],
    "note": "Mensaje si no hay gastos innecesarios detectados (siempre completar si insights está vacío)"
  },
  "reducible": {
    "insights": [{ "category": "nombre", "insight": "explicación corta e informal" }],
    "note": "Mensaje si no hay nada para reducir (siempre completar si insights está vacío)"
  },
  "preventable": "Párrafo sobre si hubo gastos excepcionales, si el patrón es normal o algo puntual."
}

Usá tono informal, con 'vos'. Sé directo y concreto. No uses frases genéricas ni moralices.`
}

export const monthAnalysisService = {
  async get(yearMonth: string): Promise<MonthAnalysis | null> {
    return (await getMonthAnalysisBackend()).get(yearMonth)
  },

  async generate(yearMonth: string, metrics: MetricsSummary): Promise<MonthAnalysis> {
    if (!GEMINI_API_KEY) throw new Error('VITE_GEMINI_API_KEY no está configurada')

    const response = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: buildPrompt(yearMonth, metrics) }] }],
      }),
    })

    if (!response.ok) throw new Error(`Gemini API error: ${response.status}`)

    const data = await response.json() as {
      candidates?: { content?: { parts?: { text?: string }[] } }[]
    }
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
    const clean = text.replace(/```json|```/g, '').trim()

    let parsed: Omit<MonthAnalysis, 'yearMonth' | 'generatedAt'>
    try {
      parsed = JSON.parse(clean) as Omit<MonthAnalysis, 'yearMonth' | 'generatedAt'>
    } catch {
      throw new Error('No se pudo interpretar la respuesta de Gemini')
    }

    const analysis: MonthAnalysis = {
      ...parsed,
      yearMonth,
      generatedAt: new Date().toISOString(),
    }

    return (await getMonthAnalysisBackend()).save(analysis)
  },
}
