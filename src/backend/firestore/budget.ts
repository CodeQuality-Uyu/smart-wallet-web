// src/backend/firestore/budget.ts
// Budget settings stored as a `budget` field on the users/{uid} document.

import { doc, getDoc, setDoc } from 'firebase/firestore'
import { firebaseAuth, firestore } from './config'
import type { IBudgetBackend } from '../types'
import type { BudgetSettings } from '@/types/models'

function requireUid(): string {
  const uid = firebaseAuth.currentUser?.uid
  if (!uid) throw { message: 'No autenticado', statusCode: 401 }
  return uid
}

export const firestoreBudgetBackend: IBudgetBackend = {
  async get(): Promise<BudgetSettings> {
    const uid = requireUid()
    const snap = await getDoc(doc(firestore, 'users', uid))
    if (!snap.exists()) return {}
    const data = snap.data()
    return (data['budget'] as BudgetSettings | undefined) ?? {}
  },

  async set(settings: BudgetSettings): Promise<BudgetSettings> {
    const uid = requireUid()
    const clean: Record<string, number> = {}
    if (settings.usd !== undefined) clean['usd'] = settings.usd
    if (settings.uyu !== undefined) clean['uyu'] = settings.uyu
    await setDoc(doc(firestore, 'users', uid), { budget: clean }, { merge: true })
    return settings
  },
}
