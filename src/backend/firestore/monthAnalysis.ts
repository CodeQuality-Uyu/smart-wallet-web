// src/backend/firestore/monthAnalysis.ts
// AI-generated monthly analysis stored at users/{uid}/monthAnalysis/{yearMonth}

import { doc, getDoc, setDoc } from 'firebase/firestore'
import { firebaseAuth, firestore } from './config'
import type { IMonthAnalysisBackend } from '../types'
import type { MonthAnalysis } from '@/types/models'

function requireUid(): string {
  const uid = firebaseAuth.currentUser?.uid
  if (!uid) throw { message: 'No autenticado', statusCode: 401 }
  return uid
}

export const firestoreMonthAnalysisBackend: IMonthAnalysisBackend = {
  async get(yearMonth: string): Promise<MonthAnalysis | null> {
    const uid = requireUid()
    const snap = await getDoc(doc(firestore, 'users', uid, 'monthAnalysis', yearMonth))
    if (!snap.exists()) return null
    return { yearMonth, ...snap.data() } as MonthAnalysis
  },

  async save(analysis: MonthAnalysis): Promise<MonthAnalysis> {
    const uid = requireUid()
    await setDoc(doc(firestore, 'users', uid, 'monthAnalysis', analysis.yearMonth), analysis)
    return analysis
  },
}
