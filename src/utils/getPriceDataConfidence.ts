// src/utils/getPriceDataConfidence.ts

import { PriceDataConfidence } from '@/types/enums'

export { PriceDataConfidence }

/**
 * Clasifica qué tan confiable es un dato de precio según su antigüedad.
 *
 *  0–30 días  → Fresh  (dato reciente, mostrar con normalidad)
 * 31–90 días  → Stale  (dato viejo, mostrar en ámbar)
 * 90+ días    → Old    (dato muy viejo, mostrar en gris con ⚠)
 */
export function getPriceDataConfidence(recordedAt: string): PriceDataConfidence {
  const recorded = new Date(recordedAt).getTime()
  const now = Date.now()
  const days = Math.floor((now - recorded) / (1000 * 60 * 60 * 24))

  if (days <= 30) return PriceDataConfidence.Fresh
  if (days <= 90) return PriceDataConfidence.Stale
  return PriceDataConfidence.Old
}
