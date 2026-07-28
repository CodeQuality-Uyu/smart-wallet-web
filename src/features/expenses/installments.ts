// src/features/expenses/installments.ts
//
// Compra en cuotas: una compra en N cuotas se materializa como N gastos (uno por mes),
// enlazados por un installmentGroupId. El monto ingresado es el TOTAL; se divide en N.
// Cada cuota cae en el mes de su fecha, por lo que aparece naturalmente en listas,
// métricas, cierres y presupuesto sin tocar esas vistas.

import type { CreateExpensePayload } from '@/types/models'

/** Cantidad máxima de cuotas permitidas (defensa; el schema también valida). */
export const MAX_INSTALLMENTS = 120

/**
 * Suma `k` meses a una fecha ISO (YYYY-MM-DD), clampeando el día al último día del
 * mes destino cuando el día original no existe (ej. 31/01 + 1 mes → 28/02).
 */
export function addMonthsClamped(isoDate: string, k: number): string {
  const [y, m, d] = isoDate.split('-').map(Number) as [number, number, number]
  // Índice de mes 0-based desde el año/mes de origen + k.
  const targetMonthIndex = m - 1 + k
  const targetYear = y + Math.floor(targetMonthIndex / 12)
  const targetMonth = ((targetMonthIndex % 12) + 12) % 12 // 0-11, seguro para k negativos
  // Último día del mes destino: día 0 del mes siguiente.
  const lastDay = new Date(targetYear, targetMonth + 1, 0).getDate()
  const day = Math.min(d, lastDay)
  const mm = String(targetMonth + 1).padStart(2, '0')
  const dd = String(day).padStart(2, '0')
  return `${targetYear}-${mm}-${dd}`
}

/**
 * Divide `total` en `count` cuotas redondeadas a 2 decimales. La última cuota absorbe
 * la diferencia de redondeo para que la suma sea exactamente `total`.
 */
export function splitInstallmentAmounts(total: number, count: number): number[] {
  if (count <= 1) return [round2(total)]
  const per = round2(total / count)
  const amounts = Array<number>(count).fill(per)
  const sumFirst = round2(per * (count - 1))
  amounts[count - 1] = round2(total - sumFirst)
  return amounts
}

/**
 * Construye los N payloads de una compra en cuotas a partir de un payload base cuyo
 * `amount` es el total y cuya `date` es la fecha de la primera cuota.
 */
export function buildInstallmentPayloads(
  base: CreateExpensePayload,
  count: number,
  groupId: string,
): CreateExpensePayload[] {
  const total = base.amount
  const amounts = splitInstallmentAmounts(total, count)
  return amounts.map((amount, i) => ({
    ...base,
    amount,
    date: addMonthsClamped(base.date, i),
    installmentGroupId: groupId,
    installmentNumber: i + 1,
    installmentCount: count,
    installmentTotalAmount: total,
  }))
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100
}
