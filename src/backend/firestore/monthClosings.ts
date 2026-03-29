// src/backend/firestore/monthClosings.ts
// Month closings are immutable snapshots stored at users/{uid}/monthClosings/{year}-{month}
import {
  collection,
  getDocs,
  getDoc,
  setDoc,
  doc,
  query,
  orderBy,
} from 'firebase/firestore'
import { firebaseAuth, firestore } from './config'
import type { IMonthClosingsBackend, MonthClosing, CreateMonthClosingPayload } from '../types'

function requireUid(): string {
  const uid = firebaseAuth.currentUser?.uid
  if (!uid) throw { message: 'No autenticado', statusCode: 401 }
  return uid
}

export const firestoreMonthClosingsBackend: IMonthClosingsBackend = {
  async list(): Promise<MonthClosing[]> {
    const uid = requireUid()
    const q = query(
      collection(firestore, 'users', uid, 'monthClosings'),
      orderBy('__name__', 'desc'),
    )
    const snap = await getDocs(q)
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as MonthClosing))
  },

  async getById(id: string): Promise<MonthClosing | null> {
    const uid = requireUid()
    const snap = await getDoc(doc(firestore, 'users', uid, 'monthClosings', id))
    if (!snap.exists()) return null
    return { id: snap.id, ...snap.data() } as MonthClosing
  },

  async create(payload: CreateMonthClosingPayload): Promise<MonthClosing> {
    const uid = requireUid()
    const closedAt = new Date().toISOString()
    const closing: MonthClosing = { ...payload, closedAt }
    await setDoc(doc(firestore, 'users', uid, 'monthClosings', payload.id), closing)
    return closing
  },
}
