// src/backend/firestore/reportAttachments.ts

import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  doc,
  query,
  where,
} from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'
import { firestore, firebaseStorage } from './config'
import { firebaseAuth } from './config'
import type { IReportAttachmentsBackend, ReportAttachment } from '../types'

function requireUid(): string {
  const uid = firebaseAuth.currentUser?.uid
  if (!uid) throw new Error('Not authenticated')
  return uid
}

export const firestoreReportAttachmentsBackend: IReportAttachmentsBackend = {
  async list(yearMonth: string): Promise<ReportAttachment[]> {
    const uid = requireUid()
    const col = collection(firestore, 'users', uid, 'reportAttachments')
    const q = query(col, where('yearMonth', '==', yearMonth))
    const snap = await getDocs(q)
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as ReportAttachment))
  },

  async upload(yearMonth: string, file: File, options?: { cardId?: string }): Promise<ReportAttachment> {
    const uid = requireUid()
    const ext = file.name.split('.').pop() ?? 'bin'
    const uuid = crypto.randomUUID()
    const storageRef = ref(firebaseStorage, `reports/${uid}/${yearMonth}/${uuid}.${ext}`)
    const snapshot = await uploadBytes(storageRef, file)
    const url = await getDownloadURL(snapshot.ref)
    const now = new Date().toISOString()
    const payload: Omit<ReportAttachment, 'id'> = {
      yearMonth,
      name: file.name,
      url,
      mimeType: file.type,
      size: file.size,
      uploadedAt: now,
      processed: false,
      ...(options?.cardId ? { cardId: options.cardId } : {}),
    }
    const docRef = await addDoc(
      collection(firestore, 'users', uid, 'reportAttachments'),
      payload,
    )
    return { id: docRef.id, ...payload }
  },

  async markProcessed(id: string, data: { importedExpenseCount: number }): Promise<ReportAttachment> {
    const uid = requireUid()
    const docRef = doc(firestore, 'users', uid, 'reportAttachments', id)
    const now = new Date().toISOString()
    await updateDoc(docRef, { processed: true, processedAt: now, importedExpenseCount: data.importedExpenseCount })
    const snap = await getDoc(docRef)
    return { id: snap.id, ...snap.data() } as ReportAttachment
  },

  async remove(id: string): Promise<void> {
    const uid = requireUid()
    const docRef = doc(firestore, 'users', uid, 'reportAttachments', id)
    // Attempt to delete from storage too (best-effort)
    try {
      const snap = await getDocs(query(collection(firestore, 'users', uid, 'reportAttachments'), where('__name__', '==', id)))
      if (!snap.empty) {
        const data = snap.docs[0].data() as ReportAttachment
        const storageRef = ref(firebaseStorage, data.url)
        await deleteObject(storageRef).catch(() => { /* ignore if already gone */ })
      }
    } catch { /* ignore */ }
    await deleteDoc(docRef)
  },
}
