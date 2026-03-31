// src/tests/mocks/data/products.ts
import type { Product } from '@/types/models'
import { ProductPricingType, WeightUnit } from '@/types/enums'

export const mockProducts: Product[] = [
  // ByWeight — sin marca (genéricos)
  {
    id: 'prod-1',
    name: 'Papa Blanca',
    pricingType: ProductPricingType.ByWeight,
    weightUnit: WeightUnit.Kg,
    productCategoryId: 'pcat-2',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'prod-2',
    name: 'Milanesa de Pollo',
    pricingType: ProductPricingType.ByWeight,
    weightUnit: WeightUnit.Kg,
    productCategoryId: 'pcat-2',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
  // ByWeight — con marca
  {
    id: 'prod-3',
    name: 'Queso Dambo',
    pricingType: ProductPricingType.ByWeight,
    weightUnit: WeightUnit.Kg,
    productCategoryId: 'pcat-1',
    brandId: 'brand-1',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
  // Fixed — con marca
  {
    id: 'prod-4',
    name: 'Leche Conaprole 1L',
    pricingType: ProductPricingType.Fixed,
    productCategoryId: 'pcat-1',
    brandId: 'brand-1',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'prod-5',
    name: 'Alfajor Fulbito',
    pricingType: ProductPricingType.Fixed,
    productCategoryId: 'pcat-3',
    brandId: 'brand-2',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
  // Fixed — sin marca
  {
    id: 'prod-6',
    name: 'Medialunas (x6)',
    pricingType: ProductPricingType.Fixed,
    productCategoryId: 'pcat-3',
    brandId: 'brand-3',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
]
