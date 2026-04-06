// src/tests/mocks/handlers.ts

import { http, HttpResponse } from 'msw'
import { Currency, RecurringPaymentStatus } from '@/types/enums'

import { mockExpenses } from './data/expenses'
import { mockCategories } from './data/categories'
import { mockGlobalPlaces, mockPlaces } from './data/places'
import { mockCards } from './data/cards'
import { mockRecurring } from './data/recurring'
import { mockMetrics } from './data/metrics'
import { mockSalaries } from './data/salaries'
import { mockBudget } from './data/budget'
import { mockCategoryLimits } from './data/categoryLimits'
import { mockMonthClosings } from './data/monthClosings'
import { mockProductCategories } from './data/productCategories'
import { mockBrands } from './data/brands'
import { mockUserProducts, mockGlobalProductSuggestions } from './data/products'
import { mockPriceHistory } from './data/priceHistory'
import { mockNotifications, mockNotificationPrefs } from './data/notifications'

const BASE = '/api'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const DEMO_CODE = '123456'
const pendingRegistrations = new Map<string, { name: string; email: string }>()

export const handlers = [
  // ─── Auth ────────────────────────────────────────────────
  http.post(`${BASE}/auth/login`, async ({ request }) => {
    const body = await request.json() as { email?: string; password?: string }
    const email = body.email?.trim() ?? ''
    if (!email || !EMAIL_RE.test(email)) {
      return HttpResponse.json({ message: 'Ingresá un email válido.' }, { status: 400 })
    }
    return HttpResponse.json({
      token: 'mock-token-smart-wallet-123',
      user: { id: 'user-1', email, name: email.split('@')[0] },
    })
  }),

  http.post(`${BASE}/auth/register`, async ({ request }) => {
    const body = await request.json() as { name?: string; email?: string; password?: string }
    const name = body.name?.trim() ?? ''
    const email = body.email?.trim() ?? ''
    if (!name) {
      return HttpResponse.json({ message: 'El nombre es requerido.' }, { status: 400 })
    }
    if (!email || !EMAIL_RE.test(email)) {
      return HttpResponse.json({ message: 'Ingresá un email válido.' }, { status: 400 })
    }
    // Store pending registration for verification
    pendingRegistrations.set(email, { name, email })
    return HttpResponse.json({
      message: 'Te enviamos un código de verificación. En modo demo usá: 123456',
    }, { status: 200 })
  }),

  http.post(`${BASE}/auth/verify`, async ({ request }) => {
    const body = await request.json() as { email?: string; code?: string }
    const email = body.email?.trim() ?? ''
    const code = body.code?.trim() ?? ''
    const pending = pendingRegistrations.get(email)
    if (!pending || code !== DEMO_CODE) {
      return HttpResponse.json({ message: 'Código inválido.' }, { status: 400 })
    }
    pendingRegistrations.delete(email)
    return HttpResponse.json({
      token: 'mock-token-smart-wallet-123',
      user: { id: 'user-1', email, name: pending.name },
    })
  }),

  // ─── Expenses ───────────────────────────────────────────
  http.get(`${BASE}/expenses`, ({ request }) => {
    const url = new URL(request.url)
    const period = url.searchParams.get('period')
    const now = new Date()

    let start: Date | null = null
    let end: Date | null = null

    if (period === '7d') {
      start = new Date(now); start.setDate(start.getDate() - 6); start.setHours(0,0,0,0)
      end = new Date(now); end.setHours(23,59,59,999)
    } else if (period === 'month') {
      start = new Date(now.getFullYear(), now.getMonth(), 1)
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
    } else if (period === '3m') {
      start = new Date(now); start.setMonth(start.getMonth() - 3); start.setHours(0,0,0,0)
      end = new Date(now); end.setHours(23,59,59,999)
    } else if (period === 'year') {
      start = new Date(now.getFullYear(), 0, 1)
      end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999)
    }

    const data = start && end
      ? mockExpenses.filter((e) => {
          const d = new Date(`${e.date}T12:00:00`)
          return d >= start! && d <= end!
        })
      : mockExpenses

    return HttpResponse.json({ data, total: data.length, page: 1, pageSize: 20 })
  }),

  http.get(`${BASE}/expenses/:id`, ({ params }) => {
    const expense = mockExpenses.find((e) => e.id === params['id'])
    if (!expense) return new HttpResponse(null, { status: 404 })
    return HttpResponse.json(expense)
  }),

  http.post(`${BASE}/expenses`, async ({ request }) => {
    const body = await request.json() as Record<string, unknown>
    const created = { ...body, id: crypto.randomUUID(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), ticketLines: [] }
    mockExpenses.unshift(created as unknown as typeof mockExpenses[0])
    return HttpResponse.json(created, { status: 201 })
  }),

  http.patch(`${BASE}/expenses/:id`, async ({ params, request }) => {
    const expense = mockExpenses.find((e) => e.id === params['id'])
    if (!expense) return new HttpResponse(null, { status: 404 })
    const body = await request.json() as Record<string, unknown>
    return HttpResponse.json({ ...expense, ...body, updatedAt: new Date().toISOString() })
  }),

  http.delete(`${BASE}/expenses/:id`, () => new HttpResponse(null, { status: 204 })),

  http.post(`${BASE}/expenses/:id/ticket-lines`, async ({ params, request }) => {
    const body = await request.json() as Record<string, unknown>
    const line = { ...body, id: crypto.randomUUID() }
    const expense = mockExpenses.find((e) => e.id === params['id'])
    if (expense) expense.ticketLines.push(line as (typeof expense.ticketLines)[number])
    return HttpResponse.json(line, { status: 201 })
  }),

  http.delete(`${BASE}/expenses/:id/ticket-lines/:lineId`, ({ params }) => {
    const expense = mockExpenses.find((e) => e.id === params['id'])
    if (expense) {
      const idx = expense.ticketLines.findIndex((l) => l.id === params['lineId'])
      if (idx !== -1) expense.ticketLines.splice(idx, 1)
    }
    return new HttpResponse(null, { status: 204 })
  }),

  http.post(`${BASE}/expenses/:id/duplicate`, ({ params }) => {
    const expense = mockExpenses.find((e) => e.id === params['id'])
    if (!expense) return new HttpResponse(null, { status: 404 })
    const copy = {
      ...expense,
      id: crypto.randomUUID(),
      description: `${expense.description} (copia)`,
      date: new Date().toISOString().split('T')[0] as string,
      ticketLines: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    mockExpenses.push(copy)
    return HttpResponse.json(copy, { status: 201 })
  }),

  // ─── Categories ─────────────────────────────────────────
  http.get(`${BASE}/categories`, () =>
    HttpResponse.json(mockCategories.filter((c) => c.active !== false))
  ),

  http.post(`${BASE}/categories`, async ({ request }) => {
    const body = await request.json() as Record<string, unknown>
    return HttpResponse.json({
      ...body,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }, { status: 201 })
  }),

  http.patch(`${BASE}/categories/:id`, async ({ params, request }) => {
    const cat = mockCategories.find((c) => c.id === params['id'])
    if (!cat) return new HttpResponse(null, { status: 404 })
    const body = await request.json() as Record<string, unknown>
    return HttpResponse.json({ ...cat, ...body })
  }),

  http.delete(`${BASE}/categories/:id`, ({ params }) => {
    const cat = mockCategories.find((c) => c.id === params['id'])
    if (!cat) return new HttpResponse(null, { status: 404 })
    cat.active = false
    cat.updatedAt = new Date().toISOString()
    return new HttpResponse(null, { status: 204 })
  }),

  // ─── Places ─────────────────────────────────────────────
  http.get(`${BASE}/places/global`, ({ request }) => {
    const q = new URL(request.url).searchParams.get('q')?.toLowerCase() ?? ''
    const results = q.length < 2
      ? []
      : mockGlobalPlaces.filter((p) => p.nameLower.includes(q))
    return HttpResponse.json(results)
  }),

  http.get(`${BASE}/places`, () =>
    HttpResponse.json(mockPlaces.filter((p) => p.active !== false))
  ),

  http.post(`${BASE}/places`, async ({ request }) => {
    const body = await request.json() as Record<string, unknown>
    return HttpResponse.json({
      ...body,
      id: crypto.randomUUID(),
      visitCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }, { status: 201 })
  }),

  http.patch(`${BASE}/places/:id`, async ({ params, request }) => {
    const place = mockPlaces.find((p) => p.id === params['id'])
    if (!place) return new HttpResponse(null, { status: 404 })
    const body = await request.json() as Record<string, unknown>
    return HttpResponse.json({ ...place, ...body })
  }),

  http.delete(`${BASE}/places/:id`, ({ params }) => {
    const place = mockPlaces.find((p) => p.id === params['id'])
    if (!place) return new HttpResponse(null, { status: 404 })
    place.active = false
    place.updatedAt = new Date().toISOString()
    return new HttpResponse(null, { status: 204 })
  }),

  // ─── Cards ──────────────────────────────────────────────
  http.get(`${BASE}/cards`, () =>
    HttpResponse.json(mockCards.filter((c) => c.active !== false))
  ),

  http.post(`${BASE}/cards`, async ({ request }) => {
    const body = await request.json() as Record<string, unknown>
    const created = {
      ...body,
      active: true,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    mockCards.unshift(created as typeof mockCards[0])
    return HttpResponse.json(created, { status: 201 })
  }),

  http.patch(`${BASE}/cards/:id`, async ({ params, request }) => {
    const card = mockCards.find((c) => c.id === params['id'])
    if (!card) return new HttpResponse(null, { status: 404 })
    const body = await request.json() as Record<string, unknown>
    Object.assign(card, body, { updatedAt: new Date().toISOString() })
    return HttpResponse.json(card)
  }),

  http.delete(`${BASE}/cards/:id`, ({ params }) => {
    const card = mockCards.find((c) => c.id === params['id'])
    if (!card) return new HttpResponse(null, { status: 404 })
    // Soft delete — preserves references from expenses and recurring payments
    card.active = false
    card.updatedAt = new Date().toISOString()
    return new HttpResponse(null, { status: 204 })
  }),

  // ─── Recurring ──────────────────────────────────────────
  http.get(`${BASE}/recurring`, () => HttpResponse.json(mockRecurring)),

  http.get(`${BASE}/recurring/:id`, ({ params }) => {
    const rec = mockRecurring.find((r) => r.id === params['id'])
    if (!rec) return new HttpResponse(null, { status: 404 })
    return HttpResponse.json(rec)
  }),

  http.post(`${BASE}/recurring`, async ({ request }) => {
    const body = await request.json() as Record<string, unknown>
    return HttpResponse.json({
      ...body,
      id: crypto.randomUUID(),
      paymentHistory: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }, { status: 201 })
  }),

  http.patch(`${BASE}/recurring/:id`, async ({ params, request }) => {
    const rec = mockRecurring.find((r) => r.id === params['id'])
    if (!rec) return new HttpResponse(null, { status: 404 })
    const body = await request.json() as Record<string, unknown>
    return HttpResponse.json({ ...rec, ...body })
  }),

  http.patch(`${BASE}/recurring/:id/status`, async ({ params, request }) => {
    const rec = mockRecurring.find((r) => r.id === params['id'])
    if (!rec) return new HttpResponse(null, { status: 404 })
    const body = await request.json() as { status: string }
    return HttpResponse.json({ ...rec, status: body.status })
  }),

  http.delete(`${BASE}/recurring/:id`, () => new HttpResponse(null, { status: 204 })),

  http.post(`${BASE}/recurring/:id/confirm-payment`, async ({ params, request }) => {
    const rec = mockRecurring.find((r) => r.id === params['id'])
    const contentType = request.headers.get('content-type') ?? ''
    let amount: number = rec?.amount ?? 0
    if (contentType.includes('multipart/form-data')) {
      const form = await request.formData()
      amount = parseFloat(form.get('amount') as string) || amount
    } else {
      const body = await request.json() as Record<string, unknown>
      amount = (body['amount'] as number) ?? amount
    }
    const now = new Date()
    const history = {
      id: crypto.randomUUID(),
      month: now.getMonth() + 1,
      year: now.getFullYear(),
      amount,
      currency: rec?.currency ?? Currency.UYU,
      paidAt: now.toISOString(),
      status: RecurringPaymentStatus.Paid,
    }
    if (rec) {
      rec.paymentHistory = [history, ...(rec.paymentHistory ?? [])]
      rec.currentMonthStatus = RecurringPaymentStatus.Paid
    }
    return HttpResponse.json(history, { status: 201 })
  }),

  // ─── Budget ──────────────────────────────────────────────
  http.get(`${BASE}/budget`, () => HttpResponse.json(mockBudget)),

  http.put(`${BASE}/budget`, async ({ request }) => {
    const body = await request.json() as Record<string, unknown>
    if (typeof body['usd'] === 'number' || body['usd'] === null) mockBudget.usd = body['usd'] as number | undefined
    if (typeof body['uyu'] === 'number' || body['uyu'] === null) mockBudget.uyu = body['uyu'] as number | undefined
    return HttpResponse.json(mockBudget)
  }),

  // ─── Category limits ─────────────────────────────────────
  http.get(`${BASE}/category-limits`, () => HttpResponse.json(mockCategoryLimits)),
  http.put(`${BASE}/category-limits`, async ({ request }) => {
    const body = await request.json() as Record<string, number>
    for (const key of Object.keys(mockCategoryLimits)) delete mockCategoryLimits[key]
    Object.assign(mockCategoryLimits, body)
    return HttpResponse.json(mockCategoryLimits)
  }),

  // ─── Metrics ────────────────────────────────────────────
  http.get(`${BASE}/metrics`, ({ request }) => {
    const url = new URL(request.url)
    const yearMonth = url.searchParams.get('yearMonth')
    const period = url.searchParams.get('period')

    function getDateRange(p: string | null): { start: Date; end: Date } | null {
      const now = new Date()
      if (p === '7d') {
        const start = new Date(now); start.setDate(start.getDate() - 6); start.setHours(0, 0, 0, 0)
        const end = new Date(now); end.setHours(23, 59, 59, 999)
        return { start, end }
      } else if (p === 'month') {
        return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999) }
      } else if (p === '3m') {
        const start = new Date(now); start.setMonth(start.getMonth() - 3); start.setHours(0, 0, 0, 0)
        const end = new Date(now); end.setHours(23, 59, 59, 999)
        return { start, end }
      } else if (p === 'year') {
        return { start: new Date(now.getFullYear(), 0, 1), end: new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999) }
      }
      return null
    }

    function computeMetrics(filtered: typeof mockExpenses) {
      const totalUsd = filtered.filter((e) => e.currency === 'USD').reduce((s, e) => s + e.amount, 0)
      const totalUyu = filtered.filter((e) => e.currency === 'UYU').reduce((s, e) => s + e.amount, 0)
      const catMap = new Map(mockCategories.map((c) => [c.id, c]))
      const byCategoryMap = new Map<string, { usd: number; uyu: number; expenseCount: number }>()
      for (const exp of filtered) {
        for (const catId of exp.categoryIds) {
          const entry = byCategoryMap.get(catId) ?? { usd: 0, uyu: 0, expenseCount: 0 }
          if (exp.currency === 'USD') entry.usd += exp.amount
          else entry.uyu += exp.amount
          entry.expenseCount += 1
          byCategoryMap.set(catId, entry)
        }
      }
      const byCategory = [...byCategoryMap.entries()]
        .map(([catId, totals]) => {
          const cat = catMap.get(catId)
          return { categoryId: catId, categoryName: cat?.name ?? catId, categoryIcon: cat?.icon ?? '📦', ...totals }
        })
        .sort((a, b) => (b.usd + b.uyu) - (a.usd + a.uyu))

      // byProductCategory — aggregate via ticketLines → product → productCategoryId
      const prodMap = new Map(mockUserProducts.map((p) => [p.id, p]))
      const pCatMap = new Map(mockProductCategories.map((pc) => [pc.id, pc]))
      const byProdCatMap = new Map<string, { usd: number; uyu: number }>()
      for (const exp of filtered) {
        for (const line of exp.ticketLines) {
          if (!line.productId) continue
          const prod = prodMap.get(line.productId)
          if (!prod?.productCategoryId) continue
          const entry = byProdCatMap.get(prod.productCategoryId) ?? { usd: 0, uyu: 0 }
          if (exp.currency === 'USD') entry.usd += line.amount
          else entry.uyu += line.amount
          byProdCatMap.set(prod.productCategoryId, entry)
        }
      }
      const byProductCategory = [...byProdCatMap.entries()]
        .map(([pcId, totals]) => {
          const pc = pCatMap.get(pcId)
          return { productCategoryId: pcId, productCategoryName: pc?.name ?? pcId, productCategoryIcon: pc?.icon ?? '📦', ...totals }
        })
        .sort((a, b) => (b.usd + b.uyu) - (a.usd + a.uyu))

      return { totalUsd, totalUyu, byCategory, byProductCategory }
    }

    if (yearMonth) {
      const [y, m] = yearMonth.split('-').map(Number) as [number, number]
      const lastDay = new Date(y, m, 0).getDate()
      const start = `${yearMonth}-01`
      const end = `${yearMonth}-${String(lastDay).padStart(2, '0')}`
      const filtered = mockExpenses.filter((e) => e.date >= start && e.date <= end)
      const { totalUsd, totalUyu, byCategory, byProductCategory } = computeMetrics(filtered)
      const fixedUsd = mockRecurring
        .filter((r) => r.paymentHistory.some((h) => `${h.year}-${String(h.month).padStart(2,'0')}` === yearMonth) || r.mode === 'auto')
        .filter((r) => r.currency === 'USD')
        .reduce((s, r) => s + r.amount, 0)
      const fixedUyu = mockRecurring
        .filter((r) => r.paymentHistory.some((h) => `${h.year}-${String(h.month).padStart(2,'0')}` === yearMonth) || r.mode === 'auto')
        .filter((r) => r.currency === 'UYU')
        .reduce((s, r) => s + r.amount, 0)
      return HttpResponse.json({
        ...mockMetrics,
        period: yearMonth,
        totalUsd: totalUsd + fixedUsd,
        totalUyu: totalUyu + fixedUyu,
        variableUsd: totalUsd,
        variableUyu: totalUyu,
        fixedUsd,
        fixedUyu,
        previousPeriodUsd: 0,
        previousPeriodUyu: 0,
        monthlyHistory: [],
        byCategory,
        previousByCategory: [],
        fixedBreakdown: [],
        byProductCategory,
      })
    }

    const range = getDateRange(period)
    if (range) {
      const filtered = mockExpenses.filter((e) => {
        const d = new Date(`${e.date}T12:00:00`)
        return d >= range.start && d <= range.end
      })
      const { totalUsd, totalUyu, byCategory, byProductCategory } = computeMetrics(filtered)
      return HttpResponse.json({
        ...mockMetrics,
        period: period ?? 'month',
        totalUsd,
        totalUyu,
        variableUsd: totalUsd,
        variableUyu: totalUyu,
        fixedUsd: 0,
        fixedUyu: 0,
        previousPeriodUsd: 0,
        previousPeriodUyu: 0,
        monthlyHistory: mockMetrics.monthlyHistory,
        byCategory,
        previousByCategory: [],
        byProductCategory,
      })
    }

    return HttpResponse.json(mockMetrics)
  }),

  // ─── Salaries ────────────────────────────────────────────
  http.get(`${BASE}/salaries`, () => HttpResponse.json(mockSalaries)),

  http.post(`${BASE}/salaries`, async ({ request }) => {
    const body = await request.json() as Record<string, unknown>
    const created = { ...body, id: crypto.randomUUID(), createdAt: new Date().toISOString() }
    mockSalaries.unshift(created as typeof mockSalaries[0])
    return HttpResponse.json(created, { status: 201 })
  }),

  http.patch(`${BASE}/salaries/:id`, async ({ request, params }) => {
    const body = await request.json() as Record<string, unknown>
    const idx = mockSalaries.findIndex((s) => s.id === params['id'])
    if (idx === -1) return new HttpResponse(null, { status: 404 })
    mockSalaries[idx] = { ...mockSalaries[idx], ...body }
    return HttpResponse.json(mockSalaries[idx])
  }),

  http.delete(`${BASE}/salaries/:id`, ({ params }) => {
    const idx = mockSalaries.findIndex((s) => s.id === params['id'])
    if (idx !== -1) mockSalaries.splice(idx, 1)
    return new HttpResponse(null, { status: 204 })
  }),

  // ─── Month closings ──────────────────────────────────────
  http.get(`${BASE}/month-closings`, () => HttpResponse.json(mockMonthClosings)),

  http.get(`${BASE}/month-closings/:id`, ({ params }) => {
    const closing = mockMonthClosings.find((c) => c.id === params['id'])
    if (!closing) return new HttpResponse(null, { status: 404 })
    return HttpResponse.json(closing)
  }),

  http.post(`${BASE}/month-closings`, async ({ request }) => {
    const body = await request.json() as Record<string, unknown>
    const closing = { ...body, closedAt: new Date().toISOString() }
    mockMonthClosings.unshift(closing as typeof mockMonthClosings[0])
    return HttpResponse.json(closing, { status: 201 })
  }),

  // ─── Product categories ───────────────────────────────────
  http.get(`${BASE}/product-categories`, () => HttpResponse.json(mockProductCategories)),

  http.post(`${BASE}/product-categories`, async ({ request }) => {
    const body = await request.json() as Record<string, unknown>
    const created = { ...body, id: crypto.randomUUID(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
    mockProductCategories.push(created as typeof mockProductCategories[0])
    return HttpResponse.json(created, { status: 201 })
  }),

  http.patch(`${BASE}/product-categories/:id`, async ({ params, request }) => {
    const cat = mockProductCategories.find((c) => c.id === params['id'])
    if (!cat) return new HttpResponse(null, { status: 404 })
    const body = await request.json() as Record<string, unknown>
    Object.assign(cat, { ...body, updatedAt: new Date().toISOString() })
    return HttpResponse.json(cat)
  }),

  http.delete(`${BASE}/product-categories/:id`, () => new HttpResponse(null, { status: 204 })),

  // ─── Brands ───────────────────────────────────────────────
  http.get(`${BASE}/brands`, ({ request }) => {
    const search = new URL(request.url).searchParams.get('search')?.toLowerCase() ?? ''
    const results = search.length >= 2
      ? mockBrands.filter((b) => b.name.toLowerCase().includes(search))
      : mockBrands
    return HttpResponse.json(results)
  }),

  http.post(`${BASE}/brands`, async ({ request }) => {
    const body = await request.json() as Record<string, unknown>
    const created = { ...body, id: crypto.randomUUID(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
    mockBrands.push(created as typeof mockBrands[0])
    return HttpResponse.json(created, { status: 201 })
  }),

  http.patch(`${BASE}/brands/:id`, async ({ params, request }) => {
    const brand = mockBrands.find((b) => b.id === params['id'])
    if (!brand) return new HttpResponse(null, { status: 404 })
    const body = await request.json() as Record<string, unknown>
    Object.assign(brand, { ...body, updatedAt: new Date().toISOString() })
    return HttpResponse.json(brand)
  }),

  http.delete(`${BASE}/brands/:id`, () => new HttpResponse(null, { status: 204 })),

  // ─── Products ─────────────────────────────────────────────
  http.get(`${BASE}/products/global`, ({ request }) => {
    const q = new URL(request.url).searchParams.get('q')?.toLowerCase() ?? ''
    const results = q.length >= 2
      ? mockGlobalProductSuggestions.filter((p) => p.name.toLowerCase().includes(q))
      : []
    return HttpResponse.json(results)
  }),

  http.get(`${BASE}/products`, ({ request }) => {
    const url = new URL(request.url)
    const search     = url.searchParams.get('search')?.toLowerCase() ?? ''
    const categoryId = url.searchParams.get('categoryId') ?? ''
    const brandId    = url.searchParams.get('brandId') ?? ''

    let results = [...mockUserProducts]
    if (search)     results = results.filter((p) => p.name.toLowerCase().includes(search))
    if (categoryId) results = results.filter((p) => p.productCategoryId === categoryId)
    if (brandId)    results = results.filter((p) => p.brandId === brandId)

    return HttpResponse.json(results)
  }),

  http.get(`${BASE}/products/:id`, ({ params }) => {
    const product = mockUserProducts.find((p) => p.id === params['id'])
    if (!product) return new HttpResponse(null, { status: 404 })
    return HttpResponse.json(product)
  }),

  http.post(`${BASE}/products`, async ({ request }) => {
    const body = await request.json() as Record<string, unknown>
    // Ensure globalProductId is always set (simulate Firestore creating global product)
    const globalProductId = (body['globalProductId'] as string | undefined) ?? crypto.randomUUID()
    const created = {
      ...body,
      id: crypto.randomUUID(),
      globalProductId,
      active: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    mockUserProducts.push(created as typeof mockUserProducts[0])
    return HttpResponse.json(created, { status: 201 })
  }),

  http.patch(`${BASE}/products/:id`, async ({ params, request }) => {
    const product = mockUserProducts.find((p) => p.id === params['id'])
    if (!product) return new HttpResponse(null, { status: 404 })
    const body = await request.json() as Record<string, unknown>
    Object.assign(product, { ...body, updatedAt: new Date().toISOString() })
    return HttpResponse.json(product)
  }),

  http.delete(`${BASE}/products/:id`, () => new HttpResponse(null, { status: 204 })),

  // ─── Price history ────────────────────────────────────────
  http.get(`${BASE}/products/:id/price-history`, ({ params }) => {
    const records = mockPriceHistory
      .filter((r) => r.productId === params['id'])
      .sort((a, b) => b.recordedAt.localeCompare(a.recordedAt))
    return HttpResponse.json(records)
  }),

  http.get(`${BASE}/products/:id/price-by-place`, ({ params }) => {
    const records = mockPriceHistory.filter((r) => r.productId === params['id'])

    const latestByPlace = new Map<string, typeof mockPriceHistory[0]>()
    for (const r of records.sort((a, b) => b.recordedAt.localeCompare(a.recordedAt))) {
      if (!latestByPlace.has(r.placeId)) latestByPlace.set(r.placeId, r)
    }

    const rows = Array.from(latestByPlace.values()).map((r) => ({
      placeId: r.placeId,
      placeName: [...mockPlaces, ...mockGlobalPlaces].find((p) => p.id === r.placeId)?.name ?? r.placeId,
      unitPrice: r.unitPrice,
      currency: r.currency,
      recordedAt: r.recordedAt,
      diffPct: 0,
    }))

    const minPrice = Math.min(...rows.map((r) => r.unitPrice))
    const result = rows.map((r) => ({
      ...r,
      diffPct: minPrice > 0 ? Math.round(((r.unitPrice - minPrice) / minPrice) * 100) : 0,
    }))

    return HttpResponse.json(result)
  }),

  http.post(`${BASE}/products/:id/price-history`, async ({ params, request }) => {
    const body = await request.json() as Record<string, unknown>
    const created = { ...body, id: crypto.randomUUID(), productId: params['id'], createdAt: new Date().toISOString() }
    mockPriceHistory.push(created as typeof mockPriceHistory[0])
    return HttpResponse.json(created, { status: 201 })
  }),

  http.patch(`${BASE}/price-history/:id`, async ({ params, request }) => {
    const record = mockPriceHistory.find((r) => r.id === params['id'])
    if (!record) return new HttpResponse(null, { status: 404 })
    const body = await request.json() as Record<string, unknown>
    Object.assign(record, body)
    return HttpResponse.json(record)
  }),

  // ─── Notifications ────────────────────────────────────────

  http.get(`${BASE}/notifications`, () => {
    return HttpResponse.json(mockNotifications.filter((n) => !('_deleted' in n)))
  }),

  http.patch(`${BASE}/notifications/:id/read`, ({ params }) => {
    const notif = mockNotifications.find((n) => n.id === params['id'])
    if (!notif) return new HttpResponse(null, { status: 404 })
    notif.read = true
    return HttpResponse.json(notif)
  }),

  http.post(`${BASE}/notifications/read-all`, () => {
    mockNotifications.forEach((n) => { n.read = true })
    return new HttpResponse(null, { status: 204 })
  }),

  http.get(`${BASE}/notifications/prefs`, () => {
    return HttpResponse.json(mockNotificationPrefs)
  }),

  http.put(`${BASE}/notifications/prefs`, async ({ request }) => {
    const body = await request.json() as typeof mockNotificationPrefs
    Object.assign(mockNotificationPrefs, body)
    return HttpResponse.json(mockNotificationPrefs)
  }),
]
