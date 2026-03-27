// src/backend/firestore/places.ts
// Places backend using Firestore collection: users/{uid}/places

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
import type { IPlacesBackend, Place, CreatePlacePayload, UpdatePlacePayload } from '../types'

function requireUid(): string {
  const uid = firebaseAuth.currentUser?.uid
  if (!uid) throw { message: 'No autenticado', statusCode: 401 }
  return uid
}

export const firestorePlacesBackend: IPlacesBackend = {
  async list(): Promise<Place[]> {
    const uid = requireUid()
    const q = query(
      collection(firestore, 'users', uid, 'places'),
      orderBy('name', 'asc'),
    )
    const snap = await getDocs(q)
    return snap.docs
      .filter((d) => d.data()['active'] === true)
      .map((d) => ({ id: d.id, ...d.data() } as Place))
  },

  async create(payload: CreatePlacePayload): Promise<Place> {
    const uid = requireUid()
    const now = new Date().toISOString()
    const data = { ...payload, visitCount: 0, active: true, createdAt: now, updatedAt: now }
    const ref = await addDoc(collection(firestore, 'users', uid, 'places'), data)
    return { id: ref.id, ...data }
  },

  async update(id: string, payload: UpdatePlacePayload): Promise<Place> {
    const uid = requireUid()
    const ref = doc(firestore, 'users', uid, 'places', id)
    await updateDoc(ref, { ...payload, updatedAt: new Date().toISOString() })
    const snap = await getDoc(ref)
    return { id: snap.id, ...snap.data() } as Place
  },

  async remove(id: string): Promise<void> {
    const uid = requireUid()
    await updateDoc(doc(firestore, 'users', uid, 'places', id), {
      active: false,
      updatedAt: new Date().toISOString(),
    })
  },
}
