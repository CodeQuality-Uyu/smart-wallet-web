// src/backend/firestore/productCategories.ts
// Per-user subcollection: users/{uid}/productCategories/{id}

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

function requireUid(): string {
  const uid = firebaseAuth.currentUser?.uid
  if (!uid) throw { message: 'No autenticado', statusCode: 401 }
  return uid
}

export const firestoreProductCategoriesBackend: IProductCategoriesBackend = {
  async list(): Promise<ProductCategory[]> {
    const uid = requireUid()
    const q = query(
      collection(firestore, 'users', uid, 'productCategories'),
      orderBy('name', 'asc'),
    )
    const snap = await getDocs(q)
    return snap.docs
      .filter((d) => d.data()['active'] !== false)
      .map((d) => ({ id: d.id, ...d.data() } as ProductCategory))
  },

  async create(payload: CreateProductCategoryPayload): Promise<ProductCategory> {
    const uid = requireUid()
    const now = new Date().toISOString()
    const data = { ...payload, active: true, createdAt: now, updatedAt: now }
    const ref = await addDoc(collection(firestore, 'users', uid, 'productCategories'), data)
    return { id: ref.id, ...data }
  },

  async update(id: string, payload: UpdateProductCategoryPayload): Promise<ProductCategory> {
    const uid = requireUid()
    const ref = doc(firestore, 'users', uid, 'productCategories', id)
    await updateDoc(ref, { ...payload, updatedAt: new Date().toISOString() })
    const snap = await getDoc(ref)
    return { id: snap.id, ...snap.data() } as ProductCategory
  },

  async remove(id: string): Promise<void> {
    const uid = requireUid()
    await updateDoc(doc(firestore, 'users', uid, 'productCategories', id), {
      active: false,
      updatedAt: new Date().toISOString(),
    })
  },
}
