// src/backend/firestore/userPrefs.ts
// User preferences stored as fields on the users/{uid} document.

import { doc, getDoc, setDoc } from 'firebase/firestore'
import { firebaseAuth, firestore } from './config'
import type { IUserPrefsBackend } from '../types'
import type { UserPrefs } from '@/types/models'

function requireUid(): string {
  const uid = firebaseAuth.currentUser?.uid
  if (!uid) throw { message: 'No autenticado', statusCode: 401 }
  return uid
}

export const firestoreUserPrefsBackend: IUserPrefsBackend = {
  async get(): Promise<UserPrefs> {
    const uid = requireUid()
    const snap = await getDoc(doc(firestore, 'users', uid))
    if (!snap.exists()) return {}
    const data = snap.data()
    return (data['userPrefs'] as UserPrefs | undefined) ?? {}
  },

  async set(prefs: Partial<UserPrefs>): Promise<UserPrefs> {
    const uid = requireUid()
    const current = await firestoreUserPrefsBackend.get()
    const merged = { ...current, ...prefs }
    await setDoc(doc(firestore, 'users', uid), { userPrefs: merged }, { merge: true })
    return merged
  },
}
