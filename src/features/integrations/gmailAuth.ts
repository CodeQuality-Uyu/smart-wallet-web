// src/features/integrations/gmailAuth.ts
//
// Autorización de solo-lectura a Gmail (scope gmail.readonly) vía Google Identity
// Services (GIS) token client. Es INDEPENDIENTE del login de la app.
//
// Ventaja sobre el popup de Firebase: GIS puede renovar el access token de forma
// SILENCIOSA (sin popup) mientras el usuario tenga sesión activa en Google y el
// permiso ya concedido. El consentimiento se guarda en la cuenta de Google (no en
// el dispositivo), así que en otro dispositivo el token se obtiene solo, sin
// volver a aceptar. El access token igual vive solo en memoria (~1h) y se refresca
// bajo demanda; nunca se persiste. El flag `linked` sí se persiste (Firestore).
//
// Requisitos:
//   - VITE_GOOGLE_CLIENT_ID = el OAuth 2.0 Client ID (Web) del proyecto (el que
//     ya creó Firebase; se ve en Google Cloud → Credenciales → IDs de cliente OAuth).
//   - Gmail API habilitada y scope gmail.readonly en la pantalla de consentimiento.

import { appConfig } from '@/app/config'

const GMAIL_SCOPE = 'https://www.googleapis.com/auth/gmail.readonly'
const GIS_SRC = 'https://accounts.google.com/gsi/client'
const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined

// ─── Tipos mínimos de GIS (evita `any`) ───────────────────

interface TokenResponse {
  access_token?: string
  expires_in?: number
  error?: string
  error_description?: string
}
interface TokenClientConfig {
  client_id: string
  scope: string
  callback: (resp: TokenResponse) => void
  error_callback?: (err: { type?: string; message?: string }) => void
}
interface TokenClient {
  requestAccessToken: (opts?: { prompt?: string }) => void
}
interface GoogleGis {
  accounts: { oauth2: { initTokenClient: (config: TokenClientConfig) => TokenClient } }
}
declare global {
  interface Window {
    google?: GoogleGis
  }
}

// ─── Token en memoria ─────────────────────────────────────

interface TokenState {
  accessToken: string
  expiresAt: number
}

let tokenState: TokenState | null = null

/** Token vigente en memoria, o null si no hay o ya expiró. */
export function getGmailAccessToken(): string | null {
  if (!tokenState) return null
  if (Date.now() >= tokenState.expiresAt) {
    tokenState = null
    return null
  }
  return tokenState.accessToken
}

export function hasValidGmailToken(): boolean {
  return getGmailAccessToken() !== null
}

function storeToken(accessToken: string, expiresInSec: number): void {
  // Margen de 60s para no usar un token a punto de vencer.
  const ttlMs = Math.max(0, (expiresInSec - 60) * 1000)
  tokenState = { accessToken, expiresAt: Date.now() + ttlMs }
}

/** Olvida el token en memoria (la sesión deja de poder sincronizar). */
export function clearGmailAccess(): void {
  tokenState = null
}

// ─── GIS: carga del script y token client ─────────────────

function loadGis(): Promise<void> {
  if (window.google?.accounts?.oauth2) return Promise.resolve()
  return new Promise((resolve, reject) => {
    const existing = document.getElementById('gis-script') as HTMLScriptElement | null
    if (existing) {
      existing.addEventListener('load', () => resolve())
      existing.addEventListener('error', () => reject(new Error('No se pudo cargar Google Identity Services.')))
      return
    }
    const s = document.createElement('script')
    s.id = 'gis-script'
    s.src = GIS_SRC
    s.async = true
    s.defer = true
    s.onload = (): void => resolve()
    s.onerror = (): void => reject(new Error('No se pudo cargar Google Identity Services.'))
    document.head.appendChild(s)
  })
}

let tokenClient: TokenClient | null = null
let pendingResolve: ((token: string) => void) | null = null
let pendingReject: ((err: Error) => void) | null = null

async function getTokenClient(): Promise<TokenClient> {
  if (tokenClient) return tokenClient
  if (!CLIENT_ID) throw new Error('Falta configurar VITE_GOOGLE_CLIENT_ID para conectar Gmail.')
  await loadGis()
  const oauth2 = window.google?.accounts.oauth2
  if (!oauth2) throw new Error('Google Identity Services no está disponible.')

  tokenClient = oauth2.initTokenClient({
    client_id: CLIENT_ID,
    scope: GMAIL_SCOPE,
    callback: (resp) => {
      if (resp.error || !resp.access_token) {
        pendingReject?.(new Error(mapGisError(resp.error)))
      } else {
        storeToken(resp.access_token, resp.expires_in ?? 3600)
        pendingResolve?.(resp.access_token)
      }
      pendingResolve = pendingReject = null
    },
    error_callback: (err) => {
      pendingReject?.(new Error(mapGisError(err.type)))
      pendingResolve = pendingReject = null
    },
  })
  return tokenClient
}

/**
 * Pide un token a GIS. `prompt: ''` no muestra UI si el permiso ya está concedido
 * y hay sesión de Google activa (renovación silenciosa); muestra el consentimiento
 * solo si hace falta.
 */
function requestToken(prompt: '' | 'consent'): Promise<string> {
  return new Promise((resolve, reject) => {
    getTokenClient()
      .then((client) => {
        // Cancela cualquier request previo pendiente para no dejarlo colgado.
        pendingReject?.(new Error('Solicitud de token reemplazada.'))
        pendingResolve = resolve
        pendingReject = reject
        client.requestAccessToken({ prompt })
      })
      .catch(reject)
  })
}

function mapGisError(type?: string): string {
  switch (type) {
    case 'popup_closed':
      return 'Cerraste la ventana de Google antes de terminar. Intentá de nuevo.'
    case 'popup_failed_to_open':
      return 'El navegador bloqueó la ventana de Google. Permitila y reintentá.'
    case 'access_denied':
      return 'No se concedió el permiso de lectura de Gmail.'
    default:
      return 'No se pudo obtener acceso a Gmail. Intentá de nuevo.'
  }
}

// ─── API pública ──────────────────────────────────────────

/**
 * Conexión interactiva (botón "Conectar"): pide el token; GIS muestra el
 * consentimiento la primera vez y nada las siguientes. Deja el token en memoria.
 * En MSW devuelve un token simulado.
 */
export async function requestGmailAccess(): Promise<string> {
  if (appConfig.backend !== 'firestore') {
    const mock = 'mock-gmail-access-token'
    storeToken(mock, 3600)
    return mock
  }
  return requestToken('')
}

/**
 * Devuelve un token válido: usa el de memoria si sigue vigente, si no intenta
 * renovarlo en silencio. Lanza si no se puede (ej. permiso revocado o sin sesión).
 * Lo usan el backend (antes de llamar a Gmail) y el panel (auto-refresh al abrir).
 */
export async function ensureGmailToken(): Promise<string> {
  const existing = getGmailAccessToken()
  if (existing) return existing
  if (appConfig.backend !== 'firestore') {
    const mock = 'mock-gmail-access-token'
    storeToken(mock, 3600)
    return mock
  }
  return requestToken('')
}
