// src/backend/firestore/pendingReceipts.ts

import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  orderBy,
  query,
} from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'
import { firestore, firebaseStorage, firebaseAuth } from './config'
import type { IPendingReceiptsBackend, PendingReceipt, UpdatePendingReceiptPayload } from '../types'
import { ReceiptStatus } from '@/types/enums'

function requireUid(): string {
  const uid = firebaseAuth.currentUser?.uid
  if (!uid) throw new Error('Not authenticated')
  return uid
}

export const firestorePendingReceiptsBackend: IPendingReceiptsBackend = {
  async list(): Promise<PendingReceipt[]> {
    const uid = requireUid()
    const col = collection(firestore, 'users', uid, 'pendingReceipts')
    const q = query(col, orderBy('createdAt', 'desc'))
    const snap = await getDocs(q)
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as PendingReceipt))
  },

  async create(file: File): Promise<PendingReceipt> {
    const uid = requireUid()
    const ext = file.name.split('.').pop() ?? 'jpg'
    const uuid = crypto.randomUUID()
    const storageRef = ref(firebaseStorage, `users/${uid}/receipts/${uuid}.${ext}`)
    const snapshot = await uploadBytes(storageRef, file)
    const imageUrl = await getDownloadURL(snapshot.ref)
    const now = new Date().toISOString()
    const payload: Omit<PendingReceipt, 'id'> = {
      imageUrl,
      status: ReceiptStatus.Pending,
      createdAt: now,
      updatedAt: now,
    }
    const docRef = await addDoc(collection(firestore, 'users', uid, 'pendingReceipts'), payload)
    return { id: docRef.id, ...payload }
  },

  async update(id: string, payload: UpdatePendingReceiptPayload): Promise<PendingReceipt> {
    const uid = requireUid()
    const docRef = doc(firestore, 'users', uid, 'pendingReceipts', id)
    const now = new Date().toISOString()
    await updateDoc(docRef, { ...payload, updatedAt: now })
    const snap = await getDocs(query(collection(firestore, 'users', uid, 'pendingReceipts')))
    const updated = snap.docs.find((d) => d.id === id)
    if (!updated) throw new Error('Receipt not found after update')
    return { id: updated.id, ...updated.data() } as PendingReceipt
  },

  async remove(id: string): Promise<void> {
    const uid = requireUid()
    const col = collection(firestore, 'users', uid, 'pendingReceipts')
    const snap = await getDocs(col)
    const docSnap = snap.docs.find((d) => d.id === id)
    if (docSnap) {
      const data = docSnap.data() as PendingReceipt
      try {
        const storageRef = ref(firebaseStorage, data.imageUrl)
        await deleteObject(storageRef).catch(() => { /* ignore */ })
      } catch { /* ignore */ }
    }
    await deleteDoc(doc(firestore, 'users', uid, 'pendingReceipts', id))
  },
}
