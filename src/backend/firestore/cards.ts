// src/backend/firestore/cards.ts
// Cards backend using Firestore collection: users/{uid}/cards

import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  query,
  orderBy,
} from 'firebase/firestore'
import { firebaseAuth, firestore } from './config'
import type { ICardsBackend, Card, CreateCardPayload } from '../types'

function requireUid(): string {
  const uid = firebaseAuth.currentUser?.uid
  if (!uid) throw { message: 'No autenticado', statusCode: 401 }
  return uid
}

export const firestoreCardsBackend: ICardsBackend = {
  async list(): Promise<Card[]> {
    const uid = requireUid()
    const q = query(
      collection(firestore, 'users', uid, 'cards'),
      orderBy('createdAt', 'desc'),
    )
    const snap = await getDocs(q)
    // Filter out soft-deleted cards client-side (active field absent = active)
    return snap.docs
      .filter((d) => d.data().active !== false)
      .map((d) => ({ id: d.id, ...d.data() } as Card))
  },

  async create(payload: CreateCardPayload): Promise<Card> {
    const uid = requireUid()
    const now = new Date().toISOString()
    const data = { ...payload, active: true, createdAt: now, updatedAt: now }
    const ref = await addDoc(collection(firestore, 'users', uid, 'cards'), data)
    return { id: ref.id, ...data }
  },

  async remove(id: string): Promise<void> {
    const uid = requireUid()
    // Soft delete — preserves references from expenses and recurring payments
    await updateDoc(doc(firestore, 'users', uid, 'cards', id), {
      active: false,
      updatedAt: new Date().toISOString(),
    })
  },
}
