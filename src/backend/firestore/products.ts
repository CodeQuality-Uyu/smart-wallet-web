// src/backend/firestore/products.ts
// Global pool:   /products/{id}               — community, nameLower for search
// User copy:     users/{uid}/products/{id}     — personal, links via globalProductId
// Price history: /priceHistory/{id}            — keyed by globalProductId

import {
  collection, getDocs, addDoc, doc, updateDoc, getDoc, query, orderBy, where, limit,
} from 'firebase/firestore'
import { firebaseAuth, firestore } from './config'
import type { Currency } from '@/types/enums'
import type {
  IProductsBackend,
  GlobalProductSuggestion,
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
    const uid = requireUid()
    const q = query(collection(firestore, 'users', uid, 'products'), orderBy('name', 'asc'))
    const snap = await getDocs(q)
    let results = snap.docs
      .filter((d) => d.data()['active'] === true)
      .map((d) => ({ id: d.id, ...d.data() } as Product))

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
    const uid = requireUid()
    const snap = await getDoc(doc(firestore, 'users', uid, 'products', id))
    if (!snap.exists()) throw { message: 'Producto no encontrado', statusCode: 404 }
    return { id: snap.id, ...snap.data() } as Product
  },

  async searchGlobal(queryStr: string): Promise<GlobalProductSuggestion[]> {
    if (queryStr.length < 2) return []
    requireUid()
    const lower = queryStr.toLowerCase()
    const upper = lower + '\uf8ff'
    const q = query(
      collection(firestore, 'products'),
      orderBy('nameLower'),
      where('nameLower', '>=', lower),
      where('nameLower', '<=', upper),
      limit(8),
    )
    const snap = await getDocs(q)
    return snap.docs.map((d) => {
      const data = d.data()
      return {
        id: d.id,
        name: data['name'] as string,
        pricingType: data['pricingType'],
        weightUnit: data['weightUnit'],
        brandId: data['brandId'],
        lastPlaceId: data['lastPlaceId'],
        lastPlaceName: data['lastPlaceName'],
        lastUnitPrice: data['lastUnitPrice'],
        lastCurrency: data['lastCurrency'],
        lastRecordedAt: data['lastRecordedAt'],
      } as GlobalProductSuggestion
    })
  },

  async create(payload: CreateProductPayload): Promise<Product> {
    const uid = requireUid()
    const now = new Date().toISOString()

    let globalProductId = payload.globalProductId

    // If not linking to an existing global product, create one first
    if (!globalProductId) {
      const globalRef = await addDoc(collection(firestore, 'products'), {
        name: payload.name,
        nameLower: payload.name.toLowerCase(),
        pricingType: payload.pricingType,
        ...(payload.weightUnit ? { weightUnit: payload.weightUnit } : {}),
        ...(payload.brandId ? { brandId: payload.brandId } : {}),
        createdAt: now,
      })
      globalProductId = globalRef.id
    }

    const data: Omit<Product, 'id'> = {
      name: payload.name,
      pricingType: payload.pricingType,
      ...(payload.weightUnit ? { weightUnit: payload.weightUnit } : {}),
      productCategoryId: payload.productCategoryId,
      ...(payload.brandId ? { brandId: payload.brandId } : {}),
      globalProductId,
      active: true,
      createdAt: now,
      updatedAt: now,
    }
    const ref = await addDoc(collection(firestore, 'users', uid, 'products'), data)
    return { id: ref.id, ...data }
  },

  async update(id: string, payload: UpdateProductPayload): Promise<Product> {
    const uid = requireUid()
    const ref = doc(firestore, 'users', uid, 'products', id)
    await updateDoc(ref, { ...payload, updatedAt: new Date().toISOString() })
    const snap = await getDoc(ref)
    return { id: snap.id, ...snap.data() } as Product
  },

  async remove(id: string): Promise<void> {
    const uid = requireUid()
    await updateDoc(doc(firestore, 'users', uid, 'products', id), {
      active: false,
      updatedAt: new Date().toISOString(),
    })
  },

  async getPriceHistory(globalProductId: string): Promise<ProductPriceRecord[]> {
    requireUid()
    const q = query(
      collection(firestore, 'priceHistory'),
      where('productId', '==', globalProductId),
      orderBy('recordedAt', 'desc'),
    )
    const snap = await getDocs(q)
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as ProductPriceRecord))
  },

  async getPriceByPlace(globalProductId: string): Promise<PriceByPlace[]> {
    requireUid()
    const q = query(
      collection(firestore, 'priceHistory'),
      where('productId', '==', globalProductId),
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

    // Denormalize last price info onto global product for searchGlobal suggestions
    const globalRef = doc(firestore, 'products', payload.productId)
    const placeSnap = await getDoc(doc(firestore, 'places', payload.placeId)).catch(() => null)
    const placeName = placeSnap?.data()?.['name'] as string | undefined
    await updateDoc(globalRef, {
      lastPlaceId: payload.placeId,
      lastPlaceName: placeName ?? payload.placeId,
      lastUnitPrice: payload.unitPrice,
      lastCurrency: payload.currency,
      lastRecordedAt: payload.recordedAt,
    }).catch(() => { /* ignore if global product not found */ })

    return { id: ref.id, ...data }
  },

  async updatePriceRecord(id: string, payload: { unitPrice: number; currency: Currency }): Promise<ProductPriceRecord> {
    requireUid()
    const ref = doc(firestore, 'priceHistory', id)
    await updateDoc(ref, payload)
    const snap = await getDoc(ref)
    return { id: snap.id, ...snap.data() } as ProductPriceRecord
  },
}
