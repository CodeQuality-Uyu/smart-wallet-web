// src/tests/features/queryEngine.test.ts
import { describe, it, expect } from 'vitest'
import { runQuery, topGroups, recurringPaymentsToRecords, type QueryLookups } from '@/features/dashboard/queryEngine'
import {
  Currency,
  CardType,
  QueryGroupBy,
  QueryAggregate,
  QueryDisplay,
  WidgetComparisonType,
  WidgetComparisonRender,
  RecurringMode,
  RecurringFrequency,
  RecurringStatus,
  RecurringPaymentStatus,
} from '@/types/enums'
import type { Expense, Category, Card, Place, QueryConfig, RecurringExpense } from '@/types/models'

function exp(partial: Partial<Expense> & Pick<Expense, 'id' | 'amount' | 'currency' | 'date'>): Expense {
  return {
    description: '',
    cardId: 'card-a',
    categoryIds: ['cat-1'],
    ticketLines: [],
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...partial,
  }
}

const expenses: Expense[] = [
  exp({ id: 'e1', amount: 1000, currency: Currency.UYU, date: '2026-07-01', categoryIds: ['cat-1'], cardId: 'card-a', placeId: 'place-x', description: 'Super compra' }),
  exp({ id: 'e2', amount: 500, currency: Currency.UYU, date: '2026-07-02', categoryIds: ['cat-1'], cardId: 'card-a', placeId: 'place-y', description: 'Café' }),
  exp({ id: 'e3', amount: 2000, currency: Currency.UYU, date: '2026-06-15', categoryIds: ['cat-2'], cardId: 'card-b', placeId: 'place-x', description: 'Nafta' }),
  exp({ id: 'e4', amount: 50, currency: Currency.USD, date: '2026-07-03', categoryIds: ['cat-1'], cardId: 'card-a', placeId: 'place-x', description: 'Libro' }),
]

const lookups: QueryLookups = {
  categories: [
    { id: 'cat-1', name: 'Comida', icon: '🍔', active: true, createdAt: '', updatedAt: '' },
    { id: 'cat-2', name: 'Transporte', icon: '🚌', active: true, createdAt: '', updatedAt: '' },
  ] as Category[],
  cards: [
    { id: 'card-a', name: 'Itaú', type: CardType.Credit, bank: 'Itaú', createdAt: '', updatedAt: '' },
    { id: 'card-b', name: 'BROU', type: CardType.Debit, bank: 'BROU', createdAt: '', updatedAt: '' },
  ] as Card[],
  places: [
    { id: 'place-x', name: 'Tata', visitCount: 0, active: true, createdAt: '', updatedAt: '' },
    { id: 'place-y', name: 'Bar', visitCount: 0, active: true, createdAt: '', updatedAt: '' },
  ] as Place[],
}

function cfg(over: Partial<QueryConfig>): QueryConfig {
  return {
    source: 'expenses',
    currency: Currency.UYU,
    period: 'month' as QueryConfig['period'],
    filters: {},
    groupBy: QueryGroupBy.None,
    aggregate: QueryAggregate.Sum,
    display: QueryDisplay.Value,
    ...over,
  }
}

describe('runQuery', () => {
  it('filtra por moneda y suma (excluye la otra moneda)', () => {
    const r = runQuery(cfg({}), expenses, lookups)
    expect(r.total).toBe(3500) // 1000 + 500 + 2000 (no el USD 50)
    expect(r.count).toBe(3)
  })

  it('agrupa por categoría y ordena por valor desc', () => {
    const r = runQuery(cfg({ groupBy: QueryGroupBy.Category }), expenses, lookups)
    expect(r.groups.map((g) => [g.label, g.value])).toEqual([
      ['Transporte', 2000],
      ['Comida', 1500],
    ])
  })

  it('cuenta gastos por categoría con aggregate = count', () => {
    const r = runQuery(cfg({ groupBy: QueryGroupBy.Category, aggregate: QueryAggregate.Count }), expenses, lookups)
    const byLabel = Object.fromEntries(r.groups.map((g) => [g.label, g.value]))
    expect(byLabel['Comida']).toBe(2)
    expect(byLabel['Transporte']).toBe(1)
  })

  it('promedia con aggregate = avg', () => {
    const r = runQuery(cfg({ aggregate: QueryAggregate.Avg }), expenses, lookups)
    expect(Math.round(r.total)).toBe(1167) // 3500 / 3
  })

  it('filtra por categoría', () => {
    const r = runQuery(cfg({ filters: { categoryIds: ['cat-1'] } }), expenses, lookups)
    expect(r.total).toBe(1500)
    expect(r.count).toBe(2)
  })

  it('filtrar por categoría padre incluye las hijas (rollup)', () => {
    const cats = [
      { id: 'p', name: 'Comida', icon: '🍔', active: true, createdAt: '', updatedAt: '' },
      { id: 'c', name: 'Café', icon: '☕', active: true, parentId: 'p', createdAt: '', updatedAt: '' },
    ] as Category[]
    const exps = [
      exp({ id: 'x1', amount: 100, currency: Currency.UYU, date: '2026-07-01', categoryIds: ['p'] }),
      exp({ id: 'x2', amount: 50, currency: Currency.UYU, date: '2026-07-02', categoryIds: ['c'] }), // hija
      exp({ id: 'x3', amount: 999, currency: Currency.UYU, date: '2026-07-03', categoryIds: ['otra'] }),
    ]
    const r = runQuery(cfg({ filters: { categoryIds: ['p'] } }), exps, { categories: cats, cards: [], places: [] })
    expect(r.total).toBe(150) // 100 (padre) + 50 (hija), excluye 'otra'
    expect(r.count).toBe(2)
  })

  it('agrupar por categoría raíz acumula las hijas en el padre', () => {
    const cats = [
      { id: 'p', name: 'Comida', icon: '🍔', active: true, createdAt: '', updatedAt: '' },
      { id: 'c', name: 'Café', icon: '☕', active: true, parentId: 'p', createdAt: '', updatedAt: '' },
    ] as Category[]
    const exps = [
      exp({ id: 'x1', amount: 100, currency: Currency.UYU, date: '2026-07-01', categoryIds: ['p'] }),
      exp({ id: 'x2', amount: 50, currency: Currency.UYU, date: '2026-07-02', categoryIds: ['c'] }),
    ]
    const r = runQuery(cfg({ groupBy: QueryGroupBy.CategoryRoot }), exps, { categories: cats, cards: [], places: [] })
    expect(r.groups.map((g) => [g.label, g.value])).toEqual([['Comida', 150]])
  })

  it('filtra por rango de monto', () => {
    const r = runQuery(cfg({ filters: { amountMin: 800 } }), expenses, lookups)
    expect(r.total).toBe(3000) // 1000 + 2000
    expect(r.count).toBe(2)
  })

  it('agrupa por mes ordenado cronológicamente', () => {
    const r = runQuery(cfg({ groupBy: QueryGroupBy.Month }), expenses, lookups)
    expect(r.groups.map((g) => g.key)).toEqual(['2026-06', '2026-07'])
  })

  it('con rango: incluye el mes borde completo, rellena vacíos y excluye fuera de rango', () => {
    const exps = [
      exp({ id: 'a', amount: 100, currency: Currency.UYU, date: '2026-04-05' }), // abril temprano (dentro del rango)
      exp({ id: 'b', amount: 200, currency: Currency.UYU, date: '2026-07-10' }),
      exp({ id: 'c', amount: 999, currency: Currency.UYU, date: '2026-01-15' }), // fuera de rango
    ]
    const range = { start: '2026-04-01', end: '2026-07-31' }
    const r = runQuery(cfg({ groupBy: QueryGroupBy.Month }), exps, lookups, new Date(2026, 6, 22), range)
    expect(r.groups.map((g) => [g.key, g.value])).toEqual([
      ['2026-04', 100],
      ['2026-05', 0],
      ['2026-06', 0],
      ['2026-07', 200],
    ])
    expect(r.total).toBe(300) // excluye el de enero
  })

  it('con `now` rellena con ceros los meses faltantes hasta el actual', () => {
    const r = runQuery(cfg({ groupBy: QueryGroupBy.Month }), expenses, lookups, new Date(2026, 8, 15))
    expect(r.groups.map((g) => g.key)).toEqual(['2026-06', '2026-07', '2026-08', '2026-09'])
    const byKey = Object.fromEntries(r.groups.map((g) => [g.key, g.value]))
    expect(byKey['2026-06']).toBe(2000)
    expect(byKey['2026-07']).toBe(1500)
    expect(byKey['2026-08']).toBe(0) // mes sin gastos, incluido igual
    expect(byKey['2026-09']).toBe(0) // mes actual, incluido en 0
  })

  it('etiqueta grupos de tarjeta con tipo + banco', () => {
    const r = runQuery(cfg({ groupBy: QueryGroupBy.Card }), expenses, lookups)
    expect(r.groups.map((g) => g.label).sort()).toEqual(['Crédito Itaú', 'Débito BROU'])
  })

  it('comparación target progress calcula el ratio', () => {
    const r = runQuery(
      cfg({ comparison: { type: WidgetComparisonType.Target, render: WidgetComparisonRender.Progress, targetValue: 5000 } }),
      expenses,
      lookups,
    )
    expect(r.comparison?.ratioPct).toBe(70) // 3500 / 5000
  })
})

describe('recurringPaymentsToRecords + runQuery (fuente recurrente)', () => {
  const recurring: RecurringExpense[] = [
    {
      id: 'rec-1',
      name: 'Netflix',
      icon: '📺',
      amount: 550,
      currency: Currency.UYU,
      categoryIds: ['cat-1'],
      cardId: 'card-a',
      mode: RecurringMode.Manual,
      frequency: RecurringFrequency.Monthly,
      status: RecurringStatus.Active,
      paymentHistory: [
        { id: 'p1', month: 5, year: 2026, amount: 450, currency: Currency.UYU, status: RecurringPaymentStatus.Paid },
        { id: 'p2', month: 6, year: 2026, amount: 500, currency: Currency.UYU, status: RecurringPaymentStatus.Paid },
        { id: 'p3', month: 7, year: 2026, amount: 550, currency: Currency.UYU, status: RecurringPaymentStatus.Paid },
      ],
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    },
  ]

  it('convierte el historial de pagos a registros dentro del rango', () => {
    const records = recurringPaymentsToRecords(recurring, 'rec-1', { start: '2026-01-01', end: '2026-12-31' })
    expect(records.map((r) => [r.date, r.amount])).toEqual([
      ['2026-05-01', 450],
      ['2026-06-01', 500],
      ['2026-07-01', 550],
    ])
  })

  it('grafica la evolución mensual del recurrente', () => {
    const records = recurringPaymentsToRecords(recurring, 'rec-1', { start: '2026-01-01', end: '2026-12-31' })
    const r = runQuery(cfg({ source: 'recurring', groupBy: QueryGroupBy.Month, aggregate: QueryAggregate.Sum }), records, lookups)
    expect(r.groups.map((g) => [g.key, g.value])).toEqual([
      ['2026-05', 450],
      ['2026-06', 500],
      ['2026-07', 550],
    ])
  })
})

describe('topGroups', () => {
  it('reduce a top-N + Otros', () => {
    const groups = [
      { key: 'a', label: 'A', value: 100 },
      { key: 'b', label: 'B', value: 80 },
      { key: 'c', label: 'C', value: 60 },
      { key: 'd', label: 'D', value: 40 },
    ]
    const r = topGroups(groups, 2)
    expect(r).toEqual([
      { key: 'a', label: 'A', value: 100 },
      { key: 'b', label: 'B', value: 80 },
      { key: '__otros__', label: 'Otros', value: 100 },
    ])
  })
})
