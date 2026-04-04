// src/backend/firestore/categoryLimits.ts
// Category limits stored as a `categoryLimits` field on the users/{uid} document.

import { doc, getDoc, setDoc } from 'firebase/firestore'
import { firebaseAuth, firestore } from './config'
import type { ICategoryLimitsBackend } from '../types'
import type { CategoryLimits } from '@/types/models'

function requireUid(): string {
  const uid = firebaseAuth.currentUser?.uid
  if (!uid) throw { message: 'No autenticado', statusCode: 401 }
  return uid
}

export const firestoreCategoryLimitsBackend: ICategoryLimitsBackend = {
  async get(): Promise<CategoryLimits> {
    const uid = requireUid()
    const snap = await getDoc(doc(firestore, 'users', uid))
    if (!snap.exists()) return {}
    const data = snap.data()
    return (data['categoryLimits'] as CategoryLimits | undefined) ?? {}
  },

  async set(limits: CategoryLimits): Promise<CategoryLimits> {
    const uid = requireUid()
    await setDoc(doc(firestore, 'users', uid), { categoryLimits: limits }, { merge: true })
    return limits
  },
}
