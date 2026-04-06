/**
 * Migration: recurring categoryId (string) → categoryIds (string[])
 *
 * Run once against production Firestore.
 * Reads every user's recurring documents and rewrites any document
 * that still has the old `categoryId` field.
 *
 * Usage:
 *   npx tsx scripts/migrate-recurring-categoryIds.ts
 *
 * Requires GOOGLE_APPLICATION_CREDENTIALS or FIREBASE_SERVICE_ACCOUNT_JSON
 * env var pointing to a service account with Firestore read/write access.
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'

// ── Init ──────────────────────────────────────────────────────
const serviceAccount = process.env['FIREBASE_SERVICE_ACCOUNT_JSON']
  ? JSON.parse(process.env['FIREBASE_SERVICE_ACCOUNT_JSON'])
  : undefined

if (!getApps().length) {
  initializeApp(serviceAccount ? { credential: cert(serviceAccount) } : undefined)
}

const db = getFirestore()

// ── Migration ─────────────────────────────────────────────────
async function migrate(): Promise<void> {
  const usersSnap = await db.collection('users').listDocuments()
  console.log(`Found ${usersSnap.length} users`)

  let total = 0
  let migrated = 0

  for (const userRef of usersSnap) {
    const recurringSnap = await userRef.collection('recurring').get()

    for (const docSnap of recurringSnap.docs) {
      total++
      const data = docSnap.data()

      // Skip documents already migrated
      if (Array.isArray(data['categoryIds'])) continue

      const oldCategoryId = data['categoryId'] as string | undefined
      const categoryIds = oldCategoryId ? [oldCategoryId] : []

      await docSnap.ref.update({
        categoryIds,
        categoryId: FieldValue.delete(),
        updatedAt: new Date().toISOString(),
      })

      migrated++
      console.log(`  Migrated ${userRef.id}/recurring/${docSnap.id}: "${oldCategoryId ?? ''}" → [${categoryIds.join(', ')}]`)
    }
  }

  console.log(`\nDone. Checked ${total} documents, migrated ${migrated}.`)
}

migrate().catch((err) => {
  console.error('Migration failed:', err)
  process.exit(1)
})
