// src/features/categories/categoryHierarchy.ts
//
// Utilidades de la jerarquía de categorías (2 niveles).

import type { Category } from '@/types/models'

/**
 * Quita el tag del padre cuando también está seleccionada una hija suya.
 *
 * Taggear padre + hija a la vez es redundante: el rollup de métricas ya le suma
 * el gasto de la hija al padre. Dejamos solo la categoría más específica (la hija)
 * para que el gasto no arrastre ambos tags.
 */
export function stripRedundantParents(ids: string[], categories: Category[]): string[] {
  const byId = new Map(categories.map((c) => [c.id, c]))
  const selected = new Set(ids)
  const redundantParents = new Set<string>()
  for (const id of selected) {
    const parentId = byId.get(id)?.parentId
    if (parentId && selected.has(parentId)) redundantParents.add(parentId)
  }
  if (redundantParents.size === 0) return ids
  return ids.filter((id) => !redundantParents.has(id))
}
