// src/tests/mocks/data/productCategories.ts
import type { ProductCategory } from '@/types/models'

export const mockProductCategories: ProductCategory[] = [
  { id: 'pcat-1', name: 'Lácteos',   icon: '🥛', color: '#06b6d4', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },
  { id: 'pcat-2', name: 'Verduras',  icon: '🥦', color: '#10b981', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },
  { id: 'pcat-3', name: 'Snacks',    icon: '🍿', color: '#f59e0b', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },
]
