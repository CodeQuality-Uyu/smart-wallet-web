// src/tests/services/gmailParseService.test.ts

import { describe, it, expect } from 'vitest'
import { buildEmailParsePrompt, parseGeminiEmailResponse } from '@/services/gmailParseService'
import { Currency } from '@/types/enums'
import type { GmailRawMessage } from '@/types/models'

const sampleMessages: GmailRawMessage[] = [
  {
    id: 'm1',
    from: 'Santander <avisos@santander.com.uy>',
    subject: 'Compra aprobada',
    date: 'Sun, 19 Jul 2026 14:32:00 -0300',
    snippet: '...',
    body: 'Compra por UYU 1.234,00 en TIENDA INGLESA',
  },
]

describe('buildEmailParsePrompt', () => {
  it('incluye el marcador que reconoce el mock y los ids de los emails', () => {
    const prompt = buildEmailParsePrompt(sampleMessages)
    expect(prompt).toContain('avisos de compra recibidos por email')
    expect(prompt).toContain('"id":"m1"')
  })
})

describe('parseGeminiEmailResponse', () => {
  it('parsea JSON con fences de markdown', () => {
    const text = '```json\n{"lines":[{"gmailMessageId":"m1","date":"2026-07-19","description":"TIENDA INGLESA","amount":1234,"currency":"UYU","suggestedCategoryName":"Supermercado"}]}\n```'
    const lines = parseGeminiEmailResponse(text)
    expect(lines).toEqual([
      {
        gmailMessageId: 'm1',
        date: '2026-07-19',
        description: 'TIENDA INGLESA',
        amount: 1234,
        currency: Currency.UYU,
        suggestedCategoryName: 'Supermercado',
      },
    ])
  })

  it('descarta líneas inválidas (sin id, sin moneda válida o monto no positivo)', () => {
    const text = JSON.stringify({
      lines: [
        { gmailMessageId: 'ok', date: '2026-07-17', description: 'NETFLIX', amount: 29.99, currency: 'USD' },
        { gmailMessageId: '', description: 'sin id', amount: 100, currency: 'UYU' },
        { gmailMessageId: 'x', description: 'moneda rara', amount: 100, currency: 'EUR' },
        { gmailMessageId: 'y', description: 'monto cero', amount: 0, currency: 'UYU' },
      ],
    })
    const lines = parseGeminiEmailResponse(text)
    expect(lines).toHaveLength(1)
    expect(lines[0]).toMatchObject({ gmailMessageId: 'ok', currency: Currency.USD, amount: 29.99 })
  })

  it('devuelve [] si no hay lines', () => {
    expect(parseGeminiEmailResponse('{}')).toEqual([])
  })

  it('tira error si el texto no es JSON', () => {
    expect(() => parseGeminiEmailResponse('no soy json')).toThrow()
  })
})
