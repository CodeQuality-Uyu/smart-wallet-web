// src/backend/firestore/productCategories.ts
// Global collection: /productCategories — shared by all users (read + create only)

import {
  collection, getDocs, addDoc, doc, updateDoc, getDoc, query, orderBy,
} from 'firebase/firestore'
import { firebaseAuth, firestore } from './config'
import type {
  IProductCategoriesBackend,
  ProductCategory,
  CreateProductCategoryPayload,
  UpdateProductCategoryPayload,
} from '../types'

function requireAuth(): void {
  if (!firebaseAuth.currentUser) throw { message: 'No autenticado', statusCode: 401 }
}

export const firestoreProductCategoriesBackend: IProductCategoriesBackend = {
  async list(): Promise<ProductCategory[]> {
    requireAuth()
    const q = query(collection(firestore, 'productCategories'), orderBy('name', 'asc'))
    const snap = await getDocs(q)
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as ProductCategory))
  },

  async create(payload: CreateProductCategoryPayload): Promise<ProductCategory> {
    requireAuth()
    const now = new Date().toISOString()
    const data = { ...payload, createdAt: now, updatedAt: now }
    const ref = await addDoc(collection(firestore, 'productCategories'), data)
    return { id: ref.id, ...data }
  },

  async update(id: string, payload: UpdateProductCategoryPayload): Promise<ProductCategory> {
    requireAuth()
    const ref = doc(firestore, 'productCategories', id)
    await updateDoc(ref, { ...payload, updatedAt: new Date().toISOString() })
    const snap = await getDoc(ref)
    return { id: snap.id, ...snap.data() } as ProductCategory
  },

  async remove(_id: string): Promise<void> {
    // Global categories are never deleted — no-op
  },
}
