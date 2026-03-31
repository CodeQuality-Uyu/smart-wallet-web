// src/backend/firestore/places.ts
// Places backend using Firestore:
//   Global pool: /places/{id}          (readable by all auth users)
//   Personal copy: users/{uid}/places/{id}  (owned by user)

import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  getDoc,
  doc,
  query,
  orderBy,
  where,
  limit,
} from 'firebase/firestore'
import { firebaseAuth, firestore } from './config'
import type { IPlacesBackend, GlobalPlace, Place, CreatePlacePayload, UpdatePlacePayload } from '../types'

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

  async searchGlobal(queryStr: string): Promise<GlobalPlace[]> {
    if (queryStr.length < 2) return []
    const lower = queryStr.toLowerCase()
    const upper = lower + '\uf8ff'
    const q = query(
      collection(firestore, 'places'),
      orderBy('nameLower'),
      where('nameLower', '>=', lower),
      where('nameLower', '<=', upper),
      limit(8),
    )
    const snap = await getDocs(q)
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as GlobalPlace))
  },

  async create(payload: CreatePlacePayload): Promise<Place> {
    const uid = requireUid()
    const now = new Date().toISOString()

    let globalPlaceId = payload.globalPlaceId

    // If not linking to an existing global place, create one first
    if (!globalPlaceId) {
      const globalRef = await addDoc(collection(firestore, 'places'), {
        name: payload.name,
        nameLower: payload.name.toLowerCase(),
        ...(payload.address ? { address: payload.address } : {}),
        ...(payload.icon ? { icon: payload.icon } : {}),
        createdAt: now,
      })
      globalPlaceId = globalRef.id
    }

    const data: Omit<Place, 'id'> = {
      name: payload.name,
      ...(payload.address ? { address: payload.address } : {}),
      ...(payload.icon ? { icon: payload.icon } : {}),
      visitCount: 0,
      active: true,
      globalPlaceId,
      createdAt: now,
      updatedAt: now,
    }
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
