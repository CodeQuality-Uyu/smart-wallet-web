// src/backend/firestore/recurring.ts
// Recurring backend using Firestore collection: users/{uid}/recurring
//
// paymentHistory is stored as an array field within the document (not a subcollection)
// since the volume per item is small and always read together with the document.
//
// currentMonthStatus is NOT stored — it is computed on every read from paymentHistory
// so it never goes stale.

import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  doc,
  query,
  orderBy,
} from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { firebaseAuth, firestore, firebaseStorage } from './config'
import { RecurringMode, RecurringPaymentStatus } from '@/types/enums'
import type {
  IRecurringBackend,
  RecurringExpense,
  CreateRecurringPayload,
  UpdateRecurringPayload,
  ConfirmRecurringPaymentPayload,
  RecurringPaymentHistory,
  RecurringStatus,
} from '../types'

function stripUndefined(obj: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined))
}

function requireUid(): string {
  const uid = firebaseAuth.currentUser?.uid
  if (!uid) throw { message: 'No autenticado', statusCode: 401 }
  return uid
}

function resolveCurrentMonthStatus(rec: RecurringExpense): RecurringPaymentStatus {
  const now = new Date()
  const month = now.getMonth() + 1
  const year = now.getFullYear()
  const paidThisMonth = rec.paymentHistory.some(
    (h) => h.month === month && h.year === year && h.status === RecurringPaymentStatus.Paid,
  )
  if (paidThisMonth) return RecurringPaymentStatus.Paid
  if (rec.mode === RecurringMode.Auto) return RecurringPaymentStatus.Paid
  return RecurringPaymentStatus.Pending
}

function toRecurring(id: string, data: Record<string, unknown>): RecurringExpense {
  // Backward compat: documents written before the categoryIds migration
  // may still have the old singular `categoryId` field.
  const categoryIds: string[] =
    Array.isArray(data['categoryIds'])
      ? (data['categoryIds'] as string[])
      : typeof data['categoryId'] === 'string' && data['categoryId']
        ? [data['categoryId'] as string]
        : []

  const rec = {
    id,
    ...data,
    categoryIds,
    paymentHistory: (data['paymentHistory'] ?? []) as RecurringExpense['paymentHistory'],
  } as RecurringExpense
  rec.currentMonthStatus = resolveCurrentMonthStatus(rec)
  return rec
}

export const firestoreRecurringBackend: IRecurringBackend = {
  async list(): Promise<RecurringExpense[]> {
    const uid = requireUid()
    const q = query(
      collection(firestore, 'users', uid, 'recurring'),
      orderBy('name', 'asc'),
    )
    const snap = await getDocs(q)
    return snap.docs.map((d) => toRecurring(d.id, d.data()))
  },

  async getById(id: string): Promise<RecurringExpense> {
    const uid = requireUid()
    const snap = await getDoc(doc(firestore, 'users', uid, 'recurring', id))
    if (!snap.exists()) throw { message: 'No encontrado', statusCode: 404 }
    return toRecurring(snap.id, snap.data())
  },

  async create(payload: CreateRecurringPayload): Promise<RecurringExpense> {
    const uid = requireUid()
    const now = new Date().toISOString()
    const data = stripUndefined({ ...payload, paymentHistory: [], createdAt: now, updatedAt: now })
    const ref = await addDoc(collection(firestore, 'users', uid, 'recurring'), data)
    return toRecurring(ref.id, data)
  },

  async update(id: string, payload: UpdateRecurringPayload): Promise<RecurringExpense> {
    const uid = requireUid()
    const ref = doc(firestore, 'users', uid, 'recurring', id)
    await updateDoc(ref, stripUndefined({ ...payload, updatedAt: new Date().toISOString() }))
    const snap = await getDoc(ref)
    return toRecurring(snap.id, snap.data() as Record<string, unknown>)
  },

  async remove(id: string): Promise<void> {
    const uid = requireUid()
    await deleteDoc(doc(firestore, 'users', uid, 'recurring', id))
  },

  async setStatus(id: string, status: RecurringStatus): Promise<RecurringExpense> {
    const uid = requireUid()
    const ref = doc(firestore, 'users', uid, 'recurring', id)
    await updateDoc(ref, { status, updatedAt: new Date().toISOString() })
    const snap = await getDoc(ref)
    return toRecurring(snap.id, snap.data() as Record<string, unknown>)
  },

  async confirmPayment(
    id: string,
    payload: ConfirmRecurringPaymentPayload,
  ): Promise<RecurringPaymentHistory> {
    const uid = requireUid()
    const docRef = doc(firestore, 'users', uid, 'recurring', id)
    const snap = await getDoc(docRef)
    if (!snap.exists()) throw { message: 'No encontrado', statusCode: 404 }

    const now = new Date()
    const entryId = crypto.randomUUID()

    let receiptUrl: string | undefined
    if (payload.receiptFile) {
      const ext = payload.receiptFile.name.split('.').pop() ?? 'jpg'
      const storageRef = ref(firebaseStorage, `receipts/${uid}/recurring/${id}/${entryId}.${ext}`)
      const snapshot = await uploadBytes(storageRef, payload.receiptFile)
      receiptUrl = await getDownloadURL(snapshot.ref)
    }

    const entry = stripUndefined({
      id: entryId,
      month: now.getMonth() + 1,
      year: now.getFullYear(),
      amount: payload.amount,
      currency: snap.data()['currency'] as RecurringPaymentHistory['currency'],
      paidAt: now.toISOString(),
      receiptUrl,
      status: RecurringPaymentStatus.Paid,
    }) as unknown as RecurringPaymentHistory

    const existing = (snap.data()['paymentHistory'] ?? []) as RecurringPaymentHistory[]
    await updateDoc(docRef, {
      paymentHistory: [...existing, entry],
      updatedAt: now.toISOString(),
    })

    return entry
  },
}
