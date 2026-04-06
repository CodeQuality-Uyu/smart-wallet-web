// src/backend/firestore/productCategoryLimits.ts
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { firebaseAuth, firestore } from './config'
import type { ICategoryLimitsBackend } from '../types'
import type { CategoryLimits } from '@/types/models'

function requireUid(): string {
  const uid = firebaseAuth.currentUser?.uid
  if (!uid) throw { message: 'No autenticado', statusCode: 401 }
  return uid
}

export const firestoreProductCategoryLimitsBackend: ICategoryLimitsBackend = {
  async get(): Promise<CategoryLimits> {
    const uid = requireUid()
    const snap = await getDoc(doc(firestore, 'users', uid))
    if (!snap.exists()) return {}
    const data = snap.data()
    return (data['productCategoryLimits'] as CategoryLimits | undefined) ?? {}
  },

  async set(limits: CategoryLimits): Promise<CategoryLimits> {
    const uid = requireUid()
    await setDoc(doc(firestore, 'users', uid), { productCategoryLimits: limits }, { merge: true })
    return limits
  },
}
