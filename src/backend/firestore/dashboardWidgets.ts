// src/backend/firestore/dashboardWidgets.ts
// Dashboard widgets backend using Firestore collection: users/{uid}/dashboardWidgets

import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  getDoc,
  doc,
  query,
  orderBy,
} from 'firebase/firestore'
import { firebaseAuth, firestore } from './config'
import type {
  IDashboardWidgetsBackend,
  DashboardWidget,
  CreateDashboardWidgetPayload,
  UpdateDashboardWidgetPayload,
} from '../types'

function requireUid(): string {
  const uid = firebaseAuth.currentUser?.uid
  if (!uid) throw { message: 'No autenticado', statusCode: 401 }
  return uid
}

// Firestore rechaza `undefined` a cualquier profundidad. El config de un widget
// es anidado (guided.blocks[].metric con campos opcionales), así que hay que
// limpiar recursivamente antes de escribir.
function stripUndefinedDeep<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((v) => stripUndefinedDeep(v)) as unknown as T
  }
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value)) {
      if (v === undefined) continue
      out[k] = stripUndefinedDeep(v)
    }
    return out as T
  }
  return value
}

export const firestoreDashboardWidgetsBackend: IDashboardWidgetsBackend = {
  async list(): Promise<DashboardWidget[]> {
    const uid = requireUid()
    const q = query(
      collection(firestore, 'users', uid, 'dashboardWidgets'),
      orderBy('position', 'asc'),
    )
    const snap = await getDocs(q)
    return snap.docs
      .filter((d) => d.data()['active'] === true)
      .map((d) => ({ id: d.id, ...d.data() }) as DashboardWidget)
  },

  async create(payload: CreateDashboardWidgetPayload): Promise<DashboardWidget> {
    const uid = requireUid()
    const now = new Date().toISOString()
    const data = stripUndefinedDeep({
      position: 0,
      ...payload,
      active: true,
      createdAt: now,
      updatedAt: now,
    })
    const ref = await addDoc(collection(firestore, 'users', uid, 'dashboardWidgets'), data)
    return { id: ref.id, ...data } as DashboardWidget
  },

  async update(id: string, payload: UpdateDashboardWidgetPayload): Promise<DashboardWidget> {
    const uid = requireUid()
    const ref = doc(firestore, 'users', uid, 'dashboardWidgets', id)
    const data = stripUndefinedDeep({ ...payload, updatedAt: new Date().toISOString() })
    await updateDoc(ref, data as Record<string, unknown>)
    const snap = await getDoc(ref)
    return { id: snap.id, ...snap.data() } as DashboardWidget
  },

  async remove(id: string): Promise<void> {
    const uid = requireUid()
    await updateDoc(doc(firestore, 'users', uid, 'dashboardWidgets', id), {
      active: false,
      updatedAt: new Date().toISOString(),
    })
  },
}
