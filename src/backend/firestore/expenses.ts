// src/backend/firestore/expenses.ts
// Expenses backend using Firestore collection: users/{uid}/expenses
//
// Receipts are stored as URLs. File upload is not supported in Firestore directly —
// this implementation skips actual file upload and returns an empty receiptUrl.
// To support real uploads, wire this to Firebase Storage.

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
import type {
  IExpensesBackend,
  Expense,
  CreateExpensePayload,
  UpdateExpensePayload,
  TicketLine,
  PaginatedResponse,
  ExpenseFilters,
} from '../types'

function stripUndefined(obj: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined))
}

/** Returns ISO date string boundaries for the given ExpenseFilterPeriod value. */
function getPeriodBounds(period: string): { start: string; end: string } | null {
  const now = new Date()
  const today = now.toISOString().split('T')[0] as string
  if (period === '7d') {
    const d = new Date(now)
    d.setDate(d.getDate() - 7)
    return { start: d.toISOString().split('T')[0] as string, end: today }
  }
  if (period === 'month') {
    const y = now.getFullYear()
    const m = String(now.getMonth() + 1).padStart(2, '0')
    return { start: `${y}-${m}-01`, end: today }
  }
  if (period === '3m') {
    const d = new Date(now)
    d.setMonth(d.getMonth() - 3)
    return { start: d.toISOString().split('T')[0] as string, end: today }
  }
  if (period === 'year') {
    return { start: `${now.getFullYear()}-01-01`, end: today }
  }
  return null
}

function requireUid(): string {
  const uid = firebaseAuth.currentUser?.uid
  if (!uid) throw { message: 'No autenticado', statusCode: 401 }
  return uid
}

export const firestoreExpensesBackend: IExpensesBackend = {
  async list(filters?: ExpenseFilters): Promise<PaginatedResponse<Expense>> {
    const uid = requireUid()
    const q = query(
      collection(firestore, 'users', uid, 'expenses'),
      orderBy('date', 'desc'),
    )
    const snap = await getDocs(q)
    const all = snap.docs.map((d) => ({ id: d.id, ticketLines: [], ...d.data() } as Expense))

    // All filters applied client-side to avoid composite index requirements
    const bounds = filters?.period ? getPeriodBounds(filters.period) : null
    const filtered = all.filter((e) => {
      if (bounds && (e.date < bounds.start || e.date > bounds.end)) return false
      if (filters?.currency && e.currency !== filters.currency) return false
      if (filters?.placeId && e.placeId !== filters.placeId) return false
      if (filters?.categoryIds?.length) {
        const hasAny = filters.categoryIds.some((cid) => e.categoryIds.includes(cid))
        if (!hasAny) return false
      }
      return true
    })

    return { data: filtered, total: filtered.length, page: 1, pageSize: filtered.length }
  },

  async getById(id: string): Promise<Expense> {
    const uid = requireUid()
    const snap = await getDoc(doc(firestore, 'users', uid, 'expenses', id))
    if (!snap.exists()) throw { message: 'No encontrado', statusCode: 404 }
    const data = snap.data()
    return { id: snap.id, ticketLines: [], ...data } as Expense
  },

  async create(payload: CreateExpensePayload): Promise<Expense> {
    const uid = requireUid()
    const now = new Date().toISOString()
    const data = stripUndefined({ ...payload, ticketLines: [], createdAt: now, updatedAt: now })
    const ref = await addDoc(collection(firestore, 'users', uid, 'expenses'), data)
    return { id: ref.id, ...data } as Expense
  },

  async update(id: string, payload: UpdateExpensePayload): Promise<Expense> {
    const uid = requireUid()
    const ref = doc(firestore, 'users', uid, 'expenses', id)
    await updateDoc(ref, stripUndefined({ ...payload, updatedAt: new Date().toISOString() }))
    const snap = await getDoc(ref)
    return { id: snap.id, ...snap.data() } as Expense
  },

  async remove(id: string): Promise<void> {
    const uid = requireUid()
    await deleteDoc(doc(firestore, 'users', uid, 'expenses', id))
  },

  async uploadReceipt(id: string, file: File): Promise<{ receiptUrl: string }> {
    const uid = requireUid()
    const ext = file.name.split('.').pop() ?? 'jpg'
    const storageRef = ref(firebaseStorage, `receipts/${uid}/expenses/${id}/${crypto.randomUUID()}.${ext}`)
    const snapshot = await uploadBytes(storageRef, file)
    const receiptUrl = await getDownloadURL(snapshot.ref)
    const expenseRef = doc(firestore, 'users', uid, 'expenses', id)
    await updateDoc(expenseRef, { receiptUrl, updatedAt: new Date().toISOString() })
    return { receiptUrl }
  },

  async addTicketLine(expenseId: string, line: Omit<TicketLine, 'id'>): Promise<TicketLine> {
    const uid = requireUid()
    const ref = doc(firestore, 'users', uid, 'expenses', expenseId)
    const snap = await getDoc(ref)
    if (!snap.exists()) throw { message: 'No encontrado', statusCode: 404 }
    const existing = (snap.data()['ticketLines'] ?? []) as TicketLine[]
    const entry: TicketLine = { id: crypto.randomUUID(), ...line }
    await updateDoc(ref, {
      ticketLines: [...existing, entry],
      updatedAt: new Date().toISOString(),
    })
    return entry
  },

  async removeTicketLine(expenseId: string, lineId: string): Promise<void> {
    const uid = requireUid()
    const ref = doc(firestore, 'users', uid, 'expenses', expenseId)
    const snap = await getDoc(ref)
    if (!snap.exists()) throw { message: 'No encontrado', statusCode: 404 }
    const existing = (snap.data()['ticketLines'] ?? []) as TicketLine[]
    await updateDoc(ref, {
      ticketLines: existing.filter((t) => t.id !== lineId),
      updatedAt: new Date().toISOString(),
    })
  },
}
