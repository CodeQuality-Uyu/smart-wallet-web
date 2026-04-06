/**
 * Migration: locales privados → pool global
 *
 * Contexto: los locales creados antes del modelo comunitario viven en
 * users/{uid}/places sin `globalPlaceId`. Este script los vincula al
 * pool global /places, creando entradas nuevas cuando no existen y
 * reutilizando las existentes por `nameLower` para deduplicar.
 *
 * Idempotente: los documentos que ya tienen `globalPlaceId` se saltean.
 *
 * Usage:
 *   npx tsx scripts/migrate-places-to-global-pool.ts
 *
 * Requisitos:
 *   - Índice en /places: campo `nameLower ASC`
 *   - FIREBASE_SERVICE_ACCOUNT_JSON o GOOGLE_APPLICATION_CREDENTIALS
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

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

  // Cache nameLower → globalPlaceId to avoid redundant Firestore reads
  const globalIndex = new Map<string, string>()

  let totalPlaces = 0
  let migratedPlaces = 0
  let createdGlobal = 0

  for (const userRef of usersSnap) {
    const placesSnap = await userRef
      .collection('places')
      .where('active', '==', true)
      .get()

    for (const placeDoc of placesSnap.docs) {
      totalPlaces++
      const data = placeDoc.data()

      if (data['globalPlaceId']) continue // already migrated

      const name = data['name'] as string | undefined
      if (!name) {
        console.warn(`  Skipping ${userRef.id}/places/${placeDoc.id} — no name field`)
        continue
      }

      const key = name.toLowerCase().trim()

      let globalId = globalIndex.get(key)

      if (!globalId) {
        // Check if a global place already exists with this nameLower
        const existing = await db
          .collection('places')
          .where('nameLower', '==', key)
          .limit(1)
          .get()

        if (!existing.empty) {
          globalId = existing.docs[0]!.id
          globalIndex.set(key, globalId)
          console.log(`  Reusing global place "${name}" (${globalId})`)
        } else {
          // Create new global place
          const newRef = await db.collection('places').add({
            name,
            nameLower: key,
            ...(data['address'] ? { address: data['address'] } : {}),
            ...(data['icon'] ? { icon: data['icon'] } : {}),
            createdAt: new Date().toISOString(),
          })
          globalId = newRef.id
          globalIndex.set(key, globalId)
          createdGlobal++
          console.log(`  Created global place "${name}" (${globalId})`)
        }
      }

      await placeDoc.ref.update({ globalPlaceId: globalId })
      migratedPlaces++
      console.log(`    Linked ${userRef.id}/places/${placeDoc.id} → ${globalId}`)
    }
  }

  console.log(
    `\nDone. Checked ${totalPlaces} private places, linked ${migratedPlaces}, created ${createdGlobal} new global entries.`,
  )
}

migrate().catch((err) => {
  console.error('Migration failed:', err)
  process.exit(1)
})
