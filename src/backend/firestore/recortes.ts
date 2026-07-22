// src/backend/firestore/recortes.ts
// Recortes backend using Firestore:
//   users/{uid}/recortes/{id}                    ← definición + lastResult denormalizado
//   users/{uid}/recortes/{id}/results/{resultId} ← historial de cálculos

import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  getDoc,
  doc,
  query,
  orderBy,
} from 'firebase/firestore'
import { firebaseAuth, firestore } from './config'
import type {
  IRecortesBackend,
  Recorte,
  RecorteResult,
  CreateRecortePayload,
  UpdateRecortePayload,
} from '../types'

function requireUid(): string {
  const uid = firebaseAuth.currentUser?.uid
  if (!uid) throw { message: 'No autenticado', statusCode: 401 }
  return uid
}

/**
 * Firestore rechaza `undefined` en cualquier nivel — también dentro de arrays y
 * objetos anidados (p.ej. los `items` de un resultado en formato lista, donde
 * `detail`/`amount`/`currency` son opcionales). Limpia recursivamente devolviendo
 * estructuras nuevas sin claves `undefined`.
 */
function stripUndefined<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((v) => stripUndefined(v)) as unknown as T
  }
  if (value !== null && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [key, v] of Object.entries(value as Record<string, unknown>)) {
      if (v === undefined) continue
      out[key] = stripUndefined(v)
    }
    return out as T
  }
  return value
}

export const firestoreRecortesBackend: IRecortesBackend = {
  async list(): Promise<Recorte[]> {
    const uid = requireUid()
    const q = query(
      collection(firestore, 'users', uid, 'recortes'),
      orderBy('createdAt', 'desc'),
    )
    const snap = await getDocs(q)
    return snap.docs
      .filter((d) => d.data()['active'] === true)
      .map((d) => ({ id: d.id, ...d.data() }) as Recorte)
  },

  async getById(id: string): Promise<Recorte> {
    const uid = requireUid()
    const snap = await getDoc(doc(firestore, 'users', uid, 'recortes', id))
    if (!snap.exists()) throw { message: 'Recorte no encontrado', statusCode: 404 }
    return { id: snap.id, ...snap.data() } as Recorte
  },

  async create(payload: CreateRecortePayload): Promise<Recorte> {
    const uid = requireUid()
    const now = new Date().toISOString()
    const data = stripUndefined({
      ...payload,
      active: true,
      createdAt: now,
      updatedAt: now,
    })
    const ref = await addDoc(collection(firestore, 'users', uid, 'recortes'), data)
    return { id: ref.id, ...data } as Recorte
  },

  async update(id: string, payload: UpdateRecortePayload): Promise<Recorte> {
    const uid = requireUid()
    const ref = doc(firestore, 'users', uid, 'recortes', id)
    await updateDoc(ref, stripUndefined({ ...payload, updatedAt: new Date().toISOString() }))
    const snap = await getDoc(ref)
    return { id: snap.id, ...snap.data() } as Recorte
  },

  async remove(id: string): Promise<void> {
    const uid = requireUid()
    await updateDoc(doc(firestore, 'users', uid, 'recortes', id), {
      active: false,
      updatedAt: new Date().toISOString(),
    })
  },

  async listResults(id: string): Promise<RecorteResult[]> {
    const uid = requireUid()
    const q = query(
      collection(firestore, 'users', uid, 'recortes', id, 'results'),
      orderBy('generatedAt', 'desc'),
    )
    const snap = await getDocs(q)
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as RecorteResult)
  },

  async addResult(id: string, result: Omit<RecorteResult, 'id'>): Promise<RecorteResult> {
    const uid = requireUid()
    const data = stripUndefined({ ...result })
    const ref = await addDoc(
      collection(firestore, 'users', uid, 'recortes', id, 'results'),
      data,
    )
    const saved = { id: ref.id, ...data } as RecorteResult
    // Denormaliza el último resultado en el doc del recorte para el feed.
    await updateDoc(doc(firestore, 'users', uid, 'recortes', id), {
      lastResult: saved,
      updatedAt: new Date().toISOString(),
    })
    return saved
  },
}
