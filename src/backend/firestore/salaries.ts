// src/backend/firestore/salaries.ts
// Salaries backend using Firestore collection: users/{uid}/salaries

import {
  collection,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
} from 'firebase/firestore'
import { firebaseAuth, firestore } from './config'
import type { ISalariesBackend, Salary, CreateSalaryPayload } from '../types'

function requireUid(): string {
  const uid = firebaseAuth.currentUser?.uid
  if (!uid) throw { message: 'No autenticado', statusCode: 401 }
  return uid
}

export const firestoreSalariesBackend: ISalariesBackend = {
  async list(): Promise<Salary[]> {
    const uid = requireUid()
    const q = query(
      collection(firestore, 'users', uid, 'salaries'),
      orderBy('createdAt', 'desc'),
    )
    const snap = await getDocs(q)
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Salary))
  },

  async create(payload: CreateSalaryPayload): Promise<Salary> {
    const uid = requireUid()
    const data = { ...payload, createdAt: new Date().toISOString() }
    const ref = await addDoc(collection(firestore, 'users', uid, 'salaries'), data)
    return { id: ref.id, ...data }
  },

  async remove(id: string): Promise<void> {
    const uid = requireUid()
    await deleteDoc(doc(firestore, 'users', uid, 'salaries', id))
  },
}
