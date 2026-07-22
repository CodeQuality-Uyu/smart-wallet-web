// src/tests/backend/gmail.test.ts

import { describe, it, expect } from 'vitest'
import {
  buildGmailQuery,
  decodeBase64Url,
  extractBody,
  parseGmailMessage,
} from '@/backend/firestore/gmail'

/** Codifica texto como lo hace Gmail: bytes UTF-8 → base64. */
function b64(text: string): string {
  return btoa(String.fromCharCode(...new TextEncoder().encode(text)))
}

describe('buildGmailQuery', () => {
  it('combina remitentes y etiquetas con OR y acota por ventana', () => {
    const q = buildGmailQuery(['a@x.com', 'b@y.com'], ['Banco'], 7)
    expect(q).toBe('(from:(a@x.com OR b@y.com) OR label:Banco) newer_than:7d')
  })

  it('con una sola fuente no envuelve en paréntesis extra', () => {
    expect(buildGmailQuery(['a@x.com'], [], 14)).toBe('from:(a@x.com) newer_than:14d')
  })

  it('cita etiquetas con espacios', () => {
    expect(buildGmailQuery([], ['Compras tarjeta'], 7)).toBe('label:"Compras tarjeta" newer_than:7d')
  })

  it('devuelve string vacío si no hay fuentes (no baja toda la bandeja)', () => {
    expect(buildGmailQuery([], [], 7)).toBe('')
  })

  it('ignora entradas en blanco y normaliza la ventana', () => {
    expect(buildGmailQuery(['  ', 'a@x.com'], [' '], 0)).toBe('from:(a@x.com) newer_than:1d')
  })
})

describe('decodeBase64Url', () => {
  it('decodifica base64url a texto UTF-8', () => {
    // "Compra $1" en base64url
    const encoded = b64('Compra $1').replace(/\+/g, '-').replace(/\//g, '_')
    expect(decodeBase64Url(encoded)).toBe('Compra $1')
  })
})

describe('extractBody', () => {
  it('prefiere text/plain', () => {
    const payload = {
      mimeType: 'multipart/alternative',
      parts: [
        { mimeType: 'text/plain', body: { data: b64('texto plano') } },
        { mimeType: 'text/html', body: { data: b64('<b>hola</b>') } },
      ],
    }
    expect(extractBody(payload)).toBe('texto plano')
  })

  it('cae a text/html sin tags si no hay text/plain', () => {
    const payload = {
      mimeType: 'multipart/alternative',
      parts: [{ mimeType: 'text/html', body: { data: b64('<p>hola <b>mundo</b></p>') } }],
    }
    expect(extractBody(payload)).toBe('hola mundo')
  })
})

describe('parseGmailMessage', () => {
  it('extrae headers, snippet y cuerpo', () => {
    const result = parseGmailMessage({
      id: 'm1',
      snippet: 'Compra por $100',
      payload: {
        headers: [
          { name: 'From', value: 'Banco <avisos@banco.com>' },
          { name: 'Subject', value: 'Compra aprobada' },
          { name: 'Date', value: 'Sun, 19 Jul 2026 14:32:00 -0300' },
        ],
        body: { data: b64('Se aprobó una compra por $100') },
      },
    })
    expect(result).toEqual({
      id: 'm1',
      from: 'Banco <avisos@banco.com>',
      subject: 'Compra aprobada',
      date: 'Sun, 19 Jul 2026 14:32:00 -0300',
      snippet: 'Compra por $100',
      body: 'Se aprobó una compra por $100',
    })
  })
})
