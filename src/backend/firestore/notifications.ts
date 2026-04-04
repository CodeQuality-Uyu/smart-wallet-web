// src/backend/firestore/notifications.ts
// Notifications stored in users/{uid}/notifications/{id}
// Preferences stored as `notificationPrefs` field on users/{uid} document

import {
  collection,
  getDocs,
  updateDoc,
  writeBatch,
  doc,
  getDoc,
  setDoc,
  query,
  orderBy,
} from 'firebase/firestore'
import { firebaseAuth, firestore } from './config'
import type { INotificationsBackend } from '../types'
import type { Notification, NotificationPrefs } from '@/types/models'

function requireUid(): string {
  const uid = firebaseAuth.currentUser?.uid
  if (!uid) throw { message: 'No autenticado', statusCode: 401 }
  return uid
}

const DEFAULT_PREFS: NotificationPrefs = {
  alerts: {
    expenses: true,
    budgetLimit: true,
    income: true,
    weeklySummary: false,
    recurring: true,
  },
  channels: {
    push: true,
    email: false,
    whatsapp: false,
  },
  quietHours: {
    enabled: false,
    from: '22:00',
    to: '08:00',
  },
}

export const firestoreNotificationsBackend: INotificationsBackend = {
  async list(): Promise<Notification[]> {
    const uid = requireUid()
    const q = query(
      collection(firestore, 'users', uid, 'notifications'),
      orderBy('createdAt', 'desc'),
    )
    const snap = await getDocs(q)
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Notification))
  },

  async markRead(id: string): Promise<Notification> {
    const uid = requireUid()
    const ref = doc(firestore, 'users', uid, 'notifications', id)
    await updateDoc(ref, { read: true })
    const snap = await getDoc(ref)
    return { id: snap.id, ...snap.data() } as Notification
  },

  async markAllRead(): Promise<void> {
    const uid = requireUid()
    const q = query(collection(firestore, 'users', uid, 'notifications'))
    const snap = await getDocs(q)
    const batch = writeBatch(firestore)
    snap.docs.forEach((d) => {
      if (!d.data()['read']) {
        batch.update(d.ref, { read: true })
      }
    })
    await batch.commit()
  },

  async getPrefs(): Promise<NotificationPrefs> {
    const uid = requireUid()
    const snap = await getDoc(doc(firestore, 'users', uid))
    if (!snap.exists()) return DEFAULT_PREFS
    const data = snap.data()
    return (data['notificationPrefs'] as NotificationPrefs | undefined) ?? DEFAULT_PREFS
  },

  async setPrefs(prefs: NotificationPrefs): Promise<NotificationPrefs> {
    const uid = requireUid()
    await setDoc(doc(firestore, 'users', uid), { notificationPrefs: prefs }, { merge: true })
    return prefs
  },
}
