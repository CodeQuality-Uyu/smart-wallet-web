// src/backend/firestore/cards.ts
// Cards backend using Firestore collection: users/{uid}/cards

import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  doc,
  query,
  orderBy,
} from 'firebase/firestore'
import { firebaseAuth, firestore } from './config'
import type { ICardsBackend, Card, CreateCardPayload, UpdateCardPayload } from '../types'

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
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Card))
  },

  async create(payload: CreateCardPayload): Promise<Card> {
    const uid = requireUid()
    const now = new Date().toISOString()
    const data = { ...payload, createdAt: now, updatedAt: now }
    const ref = await addDoc(collection(firestore, 'users', uid, 'cards'), data)
    return { id: ref.id, ...data }
  },

  async update(id: string, payload: UpdateCardPayload): Promise<Card> {
    const uid = requireUid()
    const ref = doc(firestore, 'users', uid, 'cards', id)
    await updateDoc(ref, { ...payload, updatedAt: new Date().toISOString() })
    const snap = await getDoc(ref)
    return { id: snap.id, ...snap.data() } as Card
  },

  async remove(id: string): Promise<void> {
    const uid = requireUid()
    await deleteDoc(doc(firestore, 'users', uid, 'cards', id))
  },
}
