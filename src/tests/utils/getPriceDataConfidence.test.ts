// src/tests/utils/getPriceDataConfidence.test.ts

import { describe, it, expect } from 'vitest'
import { getPriceDataConfidence } from '@/utils/getPriceDataConfidence'
import { PriceDataConfidence } from '@/types/enums'

function daysAgo(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString()
}

describe('getPriceDataConfidence', () => {
  describe('fresh (0–30 días)', () => {
    it('retorna fresh para hoy', () => {
      expect(getPriceDataConfidence(daysAgo(0))).toBe(PriceDataConfidence.Fresh)
    })

    it('retorna fresh para 1 día atrás', () => {
      expect(getPriceDataConfidence(daysAgo(1))).toBe(PriceDataConfidence.Fresh)
    })

    it('retorna fresh para exactamente 30 días', () => {
      expect(getPriceDataConfidence(daysAgo(30))).toBe(PriceDataConfidence.Fresh)
    })
  })

  describe('stale (31–90 días)', () => {
    it('retorna stale para 31 días', () => {
      expect(getPriceDataConfidence(daysAgo(31))).toBe(PriceDataConfidence.Stale)
    })

    it('retorna stale para 60 días', () => {
      expect(getPriceDataConfidence(daysAgo(60))).toBe(PriceDataConfidence.Stale)
    })

    it('retorna stale para exactamente 90 días', () => {
      expect(getPriceDataConfidence(daysAgo(90))).toBe(PriceDataConfidence.Stale)
    })
  })

  describe('old (90+ días)', () => {
    it('retorna old para 91 días', () => {
      expect(getPriceDataConfidence(daysAgo(91))).toBe(PriceDataConfidence.Old)
    })

    it('retorna old para 180 días', () => {
      expect(getPriceDataConfidence(daysAgo(180))).toBe(PriceDataConfidence.Old)
    })

    it('retorna old para 1 año', () => {
      expect(getPriceDataConfidence(daysAgo(365))).toBe(PriceDataConfidence.Old)
    })
  })
})
