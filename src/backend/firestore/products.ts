// src/backend/firestore/products.ts
// Global collections: /products, /priceHistory — shared by all users

import {
  collection, getDocs, addDoc, doc, updateDoc, getDoc, query, orderBy, where,
} from 'firebase/firestore'
import { firebaseAuth, firestore } from './config'
import type {
  IProductsBackend,
  Product,
  CreateProductPayload,
  UpdateProductPayload,
  ProductsFilter,
  ProductPriceRecord,
  CreateProductPriceRecordPayload,
  PriceByPlace,
} from '../types'

function requireUid(): string {
  const uid = firebaseAuth.currentUser?.uid
  if (!uid) throw { message: 'No autenticado', statusCode: 401 }
  return uid
}

export const firestoreProductsBackend: IProductsBackend = {
  async list(filters?: ProductsFilter): Promise<Product[]> {
    requireUid()
    const q = query(collection(firestore, 'products'), orderBy('name', 'asc'))
    const snap = await getDocs(q)
    let results = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Product))

    if (filters?.categoryId) {
      results = results.filter((p) => p.productCategoryId === filters.categoryId)
    }
    if (filters?.brandId) {
      results = results.filter((p) => p.brandId === filters.brandId)
    }
    if (filters?.search) {
      const lower = filters.search.toLowerCase()
      results = results.filter((p) => p.name.toLowerCase().includes(lower))
    }

    return results
  },

  async getById(id: string): Promise<Product> {
    requireUid()
    const snap = await getDoc(doc(firestore, 'products', id))
    if (!snap.exists()) throw { message: 'Producto no encontrado', statusCode: 404 }
    return { id: snap.id, ...snap.data() } as Product
  },

  async create(payload: CreateProductPayload): Promise<Product> {
    requireUid()
    const now = new Date().toISOString()
    const data = { ...payload, createdAt: now, updatedAt: now }
    const ref = await addDoc(collection(firestore, 'products'), data)
    return { id: ref.id, ...data }
  },

  async update(id: string, payload: UpdateProductPayload): Promise<Product> {
    requireUid()
    const ref = doc(firestore, 'products', id)
    await updateDoc(ref, { ...payload, updatedAt: new Date().toISOString() })
    const snap = await getDoc(ref)
    return { id: snap.id, ...snap.data() } as Product
  },

  async remove(_id: string): Promise<void> {
    // Global products are never deleted — no-op
  },

  async getPriceHistory(productId: string): Promise<ProductPriceRecord[]> {
    requireUid()
    const q = query(
      collection(firestore, 'priceHistory'),
      where('productId', '==', productId),
      orderBy('recordedAt', 'desc'),
    )
    const snap = await getDocs(q)
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as ProductPriceRecord))
  },

  async getPriceByPlace(productId: string): Promise<PriceByPlace[]> {
    requireUid()
    const q = query(
      collection(firestore, 'priceHistory'),
      where('productId', '==', productId),
      orderBy('recordedAt', 'desc'),
    )
    const snap = await getDocs(q)
    const records = snap.docs.map((d) => ({ id: d.id, ...d.data() } as ProductPriceRecord))

    // Keep only the most recent record per place
    const latestByPlace = new Map<string, ProductPriceRecord>()
    for (const r of records) {
      if (!latestByPlace.has(r.placeId)) latestByPlace.set(r.placeId, r)
    }

    // Fetch place names from global places pool
    const placesSnap = await getDocs(collection(firestore, 'places'))
    const placeNames = new Map(placesSnap.docs.map((d) => [d.id, d.data()['name'] as string]))

    const rows = Array.from(latestByPlace.values()).map((r) => ({
      placeId: r.placeId,
      placeName: placeNames.get(r.placeId) ?? r.placeId,
      unitPrice: r.unitPrice,
      currency: r.currency,
      recordedAt: r.recordedAt,
      diffPct: 0,
    }))

    const minPrice = Math.min(...rows.map((r) => r.unitPrice))
    return rows.map((r) => ({
      ...r,
      diffPct: minPrice > 0 ? Math.round(((r.unitPrice - minPrice) / minPrice) * 100) : 0,
    }))
  },

  async addPriceRecord(payload: CreateProductPriceRecordPayload): Promise<ProductPriceRecord> {
    requireUid()
    const now = new Date().toISOString()
    const data = { ...payload, createdAt: now }
    const ref = await addDoc(collection(firestore, 'priceHistory'), data)
    return { id: ref.id, ...data }
  },
}
