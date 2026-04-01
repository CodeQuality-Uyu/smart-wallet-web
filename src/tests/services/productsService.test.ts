// src/tests/services/productsService.test.ts

import { describe, it, expect } from 'vitest'
import { productsService } from '@/services/productsService'
import { ProductPricingType, WeightUnit, Currency } from '@/types/enums'

// ─── List ─────────────────────────────────────────────────

describe('productsService.list', () => {
  it('devuelve todos los productos sin filtros', async () => {
    const result = await productsService.list()
    expect(result).toBeInstanceOf(Array)
    expect(result.length).toBeGreaterThan(0)
  })

  it('filtra por búsqueda de texto', async () => {
    const result = await productsService.list({ search: 'leche' })
    expect(result.every((p) => p.name.toLowerCase().includes('leche'))).toBe(true)
  })

  it('filtra por categoría', async () => {
    const result = await productsService.list({ categoryId: 'pcat-1' })
    expect(result.length).toBeGreaterThan(0)
    expect(result.every((p) => p.productCategoryId === 'pcat-1')).toBe(true)
  })

  it('filtra por marca', async () => {
    const result = await productsService.list({ brandId: 'brand-1' })
    expect(result.length).toBeGreaterThan(0)
    expect(result.every((p) => p.brandId === 'brand-1')).toBe(true)
  })

  it('devuelve lista vacía cuando no hay coincidencias', async () => {
    const result = await productsService.list({ search: 'zzz-no-existe' })
    expect(result).toHaveLength(0)
  })
})

// ─── getById ──────────────────────────────────────────────

describe('productsService.getById', () => {
  it('devuelve el producto correcto', async () => {
    const product = await productsService.getById('prod-1')
    expect(product.id).toBe('prod-1')
    expect(product.name).toBe('Papa Blanca')
    expect(product.pricingType).toBe(ProductPricingType.ByWeight)
    expect(product.weightUnit).toBe(WeightUnit.Kg)
  })

  it('lanza error para id inexistente', async () => {
    await expect(productsService.getById('no-existe')).rejects.toBeDefined()
  })
})

// ─── create ───────────────────────────────────────────────

describe('productsService.create', () => {
  it('crea un producto Fixed', async () => {
    const created = await productsService.create({
      name: 'Yerba Canarias 500g',
      pricingType: ProductPricingType.Fixed,
      productCategoryId: 'pcat-3',
    })
    expect(created.id).toBeDefined()
    expect(created.name).toBe('Yerba Canarias 500g')
    expect(created.pricingType).toBe(ProductPricingType.Fixed)
  })

  it('crea un producto ByWeight con unidad', async () => {
    const created = await productsService.create({
      name: 'Tomate Perita',
      pricingType: ProductPricingType.ByWeight,
      weightUnit: WeightUnit.Kg,
      productCategoryId: 'pcat-2',
    })
    expect(created.weightUnit).toBe(WeightUnit.Kg)
    expect(created.createdAt).toBeDefined()
  })

  it('crea un producto con marca', async () => {
    const created = await productsService.create({
      name: 'Dulce de Leche La Serenísima',
      pricingType: ProductPricingType.Fixed,
      productCategoryId: 'pcat-1',
      brandId: 'brand-1',
    })
    expect(created.brandId).toBe('brand-1')
  })
})

// ─── update ───────────────────────────────────────────────

describe('productsService.update', () => {
  it('actualiza el nombre del producto', async () => {
    const updated = await productsService.update('prod-1', { name: 'Papa Colorada' })
    expect(updated.name).toBe('Papa Colorada')
    expect(updated.id).toBe('prod-1')
  })

  it('actualiza la marca', async () => {
    const updated = await productsService.update('prod-1', { brandId: 'brand-2' })
    expect(updated.brandId).toBe('brand-2')
  })
})

// ─── remove ───────────────────────────────────────────────

describe('productsService.remove', () => {
  it('elimina un producto sin lanzar error', async () => {
    await expect(productsService.remove('prod-6')).resolves.toBeUndefined()
  })
})

// ─── getPriceHistory ──────────────────────────────────────

describe('productsService.getPriceHistory', () => {
  it('devuelve el historial para un producto', async () => {
    const history = await productsService.getPriceHistory('prod-1')
    expect(history).toBeInstanceOf(Array)
    expect(history.length).toBeGreaterThan(0)
    expect(history.every((r) => r.productId === 'prod-1')).toBe(true)
  })

  it('devuelve historial vacío para producto sin registros', async () => {
    const history = await productsService.getPriceHistory('prod-2')
    expect(history).toHaveLength(0)
  })

  it('el historial viene ordenado del más reciente al más antiguo', async () => {
    const history = await productsService.getPriceHistory('prod-1')
    for (let i = 0; i < history.length - 1; i++) {
      expect(history[i]!.recordedAt >= history[i + 1]!.recordedAt).toBe(true)
    }
  })
})

// ─── getPriceByPlace ──────────────────────────────────────

describe('productsService.getPriceByPlace', () => {
  it('devuelve un registro por local (el más reciente)', async () => {
    const rows = await productsService.getPriceByPlace('prod-1')
    const placeIds = rows.map((r) => r.placeId)
    // sin duplicados de local
    expect(new Set(placeIds).size).toBe(placeIds.length)
  })

  it('el local más barato tiene diffPct = 0', async () => {
    const rows = await productsService.getPriceByPlace('prod-4')
    expect(rows.length).toBeGreaterThan(0)
    const minRow = rows.reduce((a, b) => (a.unitPrice < b.unitPrice ? a : b))
    expect(minRow.diffPct).toBe(0)
  })

  it('los locales más caros tienen diffPct > 0', async () => {
    const rows = await productsService.getPriceByPlace('prod-4')
    if (rows.length < 2) return // test irrelevante con un solo local
    const sorted = [...rows].sort((a, b) => a.unitPrice - b.unitPrice)
    expect(sorted[sorted.length - 1]!.diffPct).toBeGreaterThan(0)
  })

  it('devuelve vacío para producto sin historial', async () => {
    const rows = await productsService.getPriceByPlace('prod-2')
    expect(rows).toHaveLength(0)
  })
})

// ─── addPriceRecord ───────────────────────────────────────

describe('productsService.addPriceRecord', () => {
  it('agrega un nuevo registro de precio', async () => {
    const record = await productsService.addPriceRecord({
      productId: 'prod-5',
      placeId: 'place-1',
      unitPrice: 55,
      currency: Currency.UYU,
      recordedAt: '2026-03-30',
    })
    expect(record.id).toBeDefined()
    expect(record.productId).toBe('prod-5')
    expect(record.unitPrice).toBe(55)
    expect(record.createdAt).toBeDefined()
  })
})
