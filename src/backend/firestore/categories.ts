// src/backend/firestore/categories.ts
// Categories backend using Firestore collection: users/{uid}/categories

import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  getDoc,
  doc,
  query,
  orderBy,
  deleteField,
} from 'firebase/firestore'
import { firebaseAuth, firestore } from './config'
import type { ICategoriesBackend, Category, CreateCategoryPayload, UpdateCategoryPayload } from '../types'

function requireUid(): string {
  const uid = firebaseAuth.currentUser?.uid
  if (!uid) throw { message: 'No autenticado', statusCode: 401 }
  return uid
}

export const firestoreCategoriesBackend: ICategoriesBackend = {
  async list(): Promise<Category[]> {
    const uid = requireUid()
    const q = query(
      collection(firestore, 'users', uid, 'categories'),
      orderBy('name', 'asc'),
    )
    const snap = await getDocs(q)
    return snap.docs
      .filter((d) => d.data()['active'] === true)
      .map((d) => ({ id: d.id, ...d.data(), color: d.data()['color'] !== '' ? d.data()['color'] : null } as Category))
  },

  async create(payload: CreateCategoryPayload): Promise<Category> {
    const uid = requireUid()
    const now = new Date().toISOString()
    const data: Record<string, unknown> = { ...payload, active: true, createdAt: now, updatedAt: now }
    // Firestore rechaza undefined: descartar campos opcionales sin valor
    // (parentId de categorías raíz, límites sin configurar, etc.)
    for (const key of Object.keys(data)) {
      if (data[key] === undefined || data[key] === '') delete data[key]
    }
    const ref = await addDoc(collection(firestore, 'users', uid, 'categories'), data)
    return { id: ref.id, ...data } as Category
  },

  async update(id: string, payload: UpdateCategoryPayload): Promise<Category> {
    const uid = requireUid()
    const ref = doc(firestore, 'users', uid, 'categories', id)
    const data: Record<string, unknown> = { ...payload, updatedAt: new Date().toISOString() }
    if (payload.limitUYU == null) data['limitUYU'] = deleteField()
    if (payload.limitUSD == null) data['limitUSD'] = deleteField()
    // Desanidar (volver a raíz) elimina el campo en lugar de escribir undefined
    if (payload.parentId == null || payload.parentId === '') data['parentId'] = deleteField()
    await updateDoc(ref, data)
    const snap = await getDoc(ref)
    return { id: snap.id, ...snap.data() } as Category
  },

  async remove(id: string): Promise<void> {
    const uid = requireUid()
    await updateDoc(doc(firestore, 'users', uid, 'categories', id), {
      active: false,
      updatedAt: new Date().toISOString(),
    })
  },
}
