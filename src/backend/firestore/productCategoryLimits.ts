// src/backend/firestore/productProductCategoryLimits.ts
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { firebaseAuth, firestore } from './config'
import type { IProductCategoryLimitsBackend, ProductProductCategoryLimits } from '../types'

function requireUid(): string {
  const uid = firebaseAuth.currentUser?.uid
  if (!uid) throw { message: 'No autenticado', statusCode: 401 }
  return uid
}

export const firestoreProductProductCategoryLimitsBackend: IProductCategoryLimitsBackend = {
  async get(): Promise<ProductCategoryLimits> {
    const uid = requireUid()
    const snap = await getDoc(doc(firestore, 'users', uid))
    if (!snap.exists()) return {}
    const data = snap.data()
    return (data['productProductCategoryLimits'] as ProductCategoryLimits | undefined) ?? {}
  },

  async set(limits: ProductCategoryLimits): Promise<ProductCategoryLimits> {
    const uid = requireUid()
    await setDoc(doc(firestore, 'users', uid), { productProductCategoryLimits: limits }, { merge: true })
    return limits
  },
}
