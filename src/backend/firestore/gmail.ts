// src/backend/firestore/gmail.ts
//
// Cliente de la Gmail REST API (implementación de producción de IGmailBackend).
// NO toca Firestore: vive en la carpeta firestore/ solo porque es el backend que
// corre en producción (el factory lo elige cuando VITE_BACKEND=firestore).
// Usa el access token en memoria obtenido por gmailAuth (scope gmail.readonly).

import { ensureGmailToken } from '@/features/integrations/gmailAuth'
import type { IGmailBackend, GmailFetchParams } from '../types'
import type { GmailLabel, GmailRawMessage } from '@/types/models'

const GMAIL_API = 'https://gmail.googleapis.com/gmail/v1/users/me'
const MAX_RESULTS = 50

// ─── Helpers puros (exportados para tests) ────────────────

/**
 * Arma la query de búsqueda de Gmail. Los remitentes y las etiquetas se combinan
 * con OR (un mail sirve si viene de un remitente O tiene una etiqueta), y el
 * conjunto se acota a la ventana de días. Devuelve '' si no hay ninguna fuente
 * (para evitar traer toda la bandeja por accidente).
 */
export function buildGmailQuery(senders: string[], labels: string[], windowDays: number): string {
  const cleanSenders = senders.map((s) => s.trim()).filter(Boolean)
  const cleanLabels = labels.map((l) => l.trim()).filter(Boolean)

  const sources: string[] = []
  if (cleanSenders.length) sources.push(`from:(${cleanSenders.join(' OR ')})`)
  for (const label of cleanLabels) {
    sources.push(label.includes(' ') ? `label:"${label}"` : `label:${label}`)
  }
  if (!sources.length) return ''

  const days = Math.max(1, Math.round(windowDays))
  const sourceClause = sources.length === 1 ? sources[0] : `(${sources.join(' OR ')})`
  return `${sourceClause} newer_than:${days}d`
}

/** Decodifica una cadena base64url (formato de los cuerpos de Gmail) a texto UTF-8. */
export function decodeBase64Url(data: string): string {
  const normalized = data.replace(/-/g, '+').replace(/_/g, '/')
  const binary = atob(normalized)
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0))
  return new TextDecoder('utf-8').decode(bytes)
}

interface GmailApiPart {
  mimeType?: string
  body?: { data?: string; size?: number }
  parts?: GmailApiPart[]
}

interface GmailApiMessage {
  id: string
  snippet?: string
  payload?: GmailApiPart & { headers?: { name: string; value: string }[] }
}

function findPart(part: GmailApiPart | undefined, mime: string): GmailApiPart | null {
  if (!part) return null
  if (part.mimeType === mime && part.body?.data) return part
  for (const child of part.parts ?? []) {
    const found = findPart(child, mime)
    if (found) return found
  }
  return null
}

function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Extrae el cuerpo en texto plano: prefiere text/plain, cae a text/html sin tags. */
export function extractBody(payload: GmailApiPart | undefined): string {
  const plain = findPart(payload, 'text/plain')
  if (plain?.body?.data) return decodeBase64Url(plain.body.data)
  const html = findPart(payload, 'text/html')
  if (html?.body?.data) return stripHtml(decodeBase64Url(html.body.data))
  if (payload?.body?.data) return decodeBase64Url(payload.body.data)
  return ''
}

/** Convierte un mensaje crudo de la API en nuestro GmailRawMessage. */
export function parseGmailMessage(msg: GmailApiMessage): GmailRawMessage {
  const headers = msg.payload?.headers ?? []
  const header = (name: string): string =>
    headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value ?? ''
  return {
    id: msg.id,
    from: header('From'),
    subject: header('Subject'),
    date: header('Date'),
    snippet: msg.snippet ?? '',
    body: extractBody(msg.payload),
  }
}

// ─── Cliente HTTP ─────────────────────────────────────────

/** Traduce el status de la Gmail API a un mensaje accionable. */
function mapGmailApiError(status: number): string {
  switch (status) {
    case 401:
      return 'Tu sesión de Gmail expiró. Desconectá y volvé a conectar tu cuenta.'
    case 403:
      return 'Gmail rechazó el acceso (403). Verificá que la Gmail API esté habilitada en el proyecto y que hayas dado el permiso de lectura al conectar. Probá desconectar y conectar de nuevo.'
    case 429:
      return 'Demasiadas solicitudes a Gmail. Esperá un momento y reintentá.'
    default:
      return `Error de Gmail (${status}). Intentá de nuevo.`
  }
}

async function gmailGet<T>(path: string): Promise<T> {
  // Renueva el token en silencio si hace falta (o usa el de memoria si sigue vigente).
  const token = await ensureGmailToken()
  const res = await fetch(`${GMAIL_API}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    console.error(`[gmail] API error ${res.status}:`, detail)
    throw new Error(mapGmailApiError(res.status))
  }
  return (await res.json()) as T
}

export const firestoreGmailBackend: IGmailBackend = {
  async listLabels(): Promise<GmailLabel[]> {
    const data = await gmailGet<{ labels?: { id: string; name: string; type?: string }[] }>('/labels')
    return (data.labels ?? [])
      // Etiquetas del usuario primero (las del sistema como INBOX/SENT quedan al final).
      .sort((a, b) => (a.type === 'user' ? -1 : 1) - (b.type === 'user' ? -1 : 1))
      .map((l) => ({ id: l.id, name: l.name }))
  },

  async fetchMessages({ senders, labels, windowDays, seenIds }: GmailFetchParams): Promise<GmailRawMessage[]> {
    const query = buildGmailQuery(senders, labels, windowDays)
    if (!query) return [] // sin fuentes → no traer nada (evita bajar toda la bandeja)

    const list = await gmailGet<{ messages?: { id: string }[] }>(
      `/messages?q=${encodeURIComponent(query)}&maxResults=${MAX_RESULTS}`,
    )
    // Se excluyen los ya vistos ANTES de bajar los cuerpos: solo se descarga el
    // contenido de los mails nuevos (menos llamadas a la API).
    const seen = new Set(seenIds)
    const ids = (list.messages ?? []).map((m) => m.id).filter((id) => !seen.has(id))

    const messages = await Promise.all(
      ids.map((id) => gmailGet<GmailApiMessage>(`/messages/${id}?format=full`)),
    )
    return messages.map(parseGmailMessage)
  },
}
