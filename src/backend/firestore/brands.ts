// src/backend/firestore/brands.ts
// Global collection: /brands — shared by all users (read + create only)
// nameLower stored for case-insensitive prefix search

import {
  collection, getDocs, addDoc, doc, updateDoc, getDoc, query, orderBy, where, limit,
} from 'firebase/firestore'
import { firebaseAuth, firestore } from './config'
import type { IBrandsBackend, Brand, CreateBrandPayload, UpdateBrandPayload } from '../types'

function requireAuth(): void {
  if (!firebaseAuth.currentUser) throw { message: 'No autenticado', statusCode: 401 }
}

export const firestoreBrandsBackend: IBrandsBackend = {
  async list(): Promise<Brand[]> {
    requireAuth()
    const q = query(collection(firestore, 'brands'), orderBy('name', 'asc'))
    const snap = await getDocs(q)
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Brand))
  },

  async search(queryStr: string): Promise<Brand[]> {
    if (queryStr.length < 2) return []
    requireAuth()
    const lower = queryStr.toLowerCase()
    const upper = lower + '\uf8ff'
    const q = query(
      collection(firestore, 'brands'),
      orderBy('nameLower'),
      where('nameLower', '>=', lower),
      where('nameLower', '<=', upper),
      limit(8),
    )
    const snap = await getDocs(q)
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Brand))
  },

  async create(payload: CreateBrandPayload): Promise<Brand> {
    requireAuth()
    const now = new Date().toISOString()
    const data = { ...payload, nameLower: payload.name.toLowerCase(), createdAt: now, updatedAt: now }
    const ref = await addDoc(collection(firestore, 'brands'), data)
    return { id: ref.id, ...data }
  },

  async update(id: string, payload: UpdateBrandPayload): Promise<Brand> {
    requireAuth()
    const ref = doc(firestore, 'brands', id)
    const updateData = {
      ...payload,
      ...(payload.name ? { nameLower: payload.name.toLowerCase() } : {}),
      updatedAt: new Date().toISOString(),
    }
    await updateDoc(ref, updateData)
    const snap = await getDoc(ref)
    return { id: snap.id, ...snap.data() } as Brand
  },

  async remove(_id: string): Promise<void> {
    // Global brands are never deleted — no-op
  },
}
