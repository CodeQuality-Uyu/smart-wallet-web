// src/tests/mocks/handlers.ts

import { http, HttpResponse } from 'msw'
import { Currency, RecurringMode, RecurringPaymentStatus, ReceiptStatus } from '@/types/enums'
import type { CategorySpend, ProductCategorySpend, MonthAnalysis, GmailPendingItem } from '@/types/models'

import { mockExpenses } from './data/expenses'
import { mockCategories } from './data/categories'
import { mockGlobalPlaces, mockPlaces } from './data/places'
import { mockCards } from './data/cards'
import { mockRecurring } from './data/recurring'
import { mockMetrics } from './data/metrics'
import { mockSalaries } from './data/salaries'
import { mockBudget } from './data/budget'
import { mockProductCategoryLimits } from './data/productCategoryLimits'
import { mockMonthClosings } from './data/monthClosings'
import { mockProductCategories } from './data/productCategories'
import { mockBrands } from './data/brands'
import { mockUserProducts, mockGlobalProductSuggestions } from './data/products'
import { mockPriceHistory } from './data/priceHistory'
import { mockNotifications, mockNotificationPrefs } from './data/notifications'
import { mockReportAttachments } from './data/reportAttachments'
import { mockUserPrefs } from './data/userPrefs'
import { mockGmailIntegration, mockGmailQueue } from './data/gmailIntegration'
import { mockGmailLabels, mockGmailMessages } from './data/gmailMessages'
import { mockMonthAnalyses } from './data/monthAnalysis'
import { mockPendingReceipts } from './data/pendingReceipts'
import { mockDashboardWidgets } from './data/dashboardWidgets'
import { mockRecortes, mockRecorteResults } from './data/recortes'

const BASE = '/api'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const DEMO_CODE = '123456'
const pendingRegistrations = new Map<string, { name: string; email: string }>()
// Social auth state
const knownUsers = new Set<string>(['user@demo.com'])
const pendingMagicLinks = new Map<string, string>() // email → email (just tracking)

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

  http.post(`${BASE}/auth/google`, async () => {
    const email = 'google@demo.com'
    const isNewUser = !knownUsers.has(email)
    knownUsers.add(email)
    return HttpResponse.json({
      token: 'mock-token-smart-wallet-123',
      user: { id: 'google-user-1', email, name: 'Usuario Google' },
      isNewUser,
    })
  }),

  http.post(`${BASE}/auth/magic-link/send`, async ({ request }) => {
    const body = await request.json() as { email?: string }
    const email = body.email?.trim() ?? ''
    if (!email || !EMAIL_RE.test(email)) {
      return HttpResponse.json({ message: 'Ingresá un email válido.' }, { status: 400 })
    }
    pendingMagicLinks.set(email, email)
    return HttpResponse.json({ message: 'Link enviado. En modo demo usá el botón "Simular link".' })
  }),

  http.post(`${BASE}/auth/magic-link/confirm`, async ({ request }) => {
    const body = await request.json() as { email?: string }
    const email = body.email?.trim() ?? ''
    if (!pendingMagicLinks.has(email)) {
      return HttpResponse.json({ message: 'No hay un link pendiente para ese email.' }, { status: 400 })
    }
    const isNewUser = !knownUsers.has(email)
    knownUsers.add(email)
    pendingMagicLinks.delete(email)
    return HttpResponse.json({
      token: 'mock-token-smart-wallet-123',
      user: { id: `magic-${email}`, email, name: email.split('@')[0] },
      isNewUser,
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
    const rawLines = Array.isArray(body['ticketLines']) ? (body['ticketLines'] as Record<string, unknown>[]) : []
    const ticketLines = rawLines.map((line) => ({ id: crypto.randomUUID(), ...line }))
    const created = { ...body, id: crypto.randomUUID(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), ticketLines }
    mockExpenses.unshift(created as unknown as typeof mockExpenses[0])
    return HttpResponse.json(created, { status: 201 })
  }),

  http.patch(`${BASE}/expenses/:id`, async ({ params, request }) => {
    const expense = mockExpenses.find((e) => e.id === params['id'])
    if (!expense) return new HttpResponse(null, { status: 404 })
    const body = await request.json() as Record<string, unknown>
    const merged: Record<string, unknown> = { ...expense, ...body, updatedAt: new Date().toISOString() }
    if (body['placeId'] === null) delete merged['placeId']
    return HttpResponse.json(merged)
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

  http.post(`${BASE}/expenses/:id/receipt`, async ({ params }) => {
    const expense = mockExpenses.find((e) => e.id === params['id'])
    if (!expense) return new HttpResponse(null, { status: 404 })
    const receiptUrl = `https://mock-storage.example.com/receipts/${params['id']}.jpg`
    Object.assign(expense, { receiptUrl })
    return HttpResponse.json({ receiptUrl }, { status: 200 })
  }),

  http.post(`${BASE}/expenses/batch`, async ({ request }) => {
    const payloads = await request.json() as Record<string, unknown>[]
    const created = payloads.map((body) => ({
      ...body,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ticketLines: [],
    }))
    created.forEach((e) => mockExpenses.unshift(e as unknown as typeof mockExpenses[0]))
    return HttpResponse.json(created, { status: 201 })
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

  // ─── Dashboard widgets (visualizadores fijos) ───────────
  http.get(`${BASE}/dashboard-widgets`, () =>
    HttpResponse.json(
      mockDashboardWidgets
        .filter((w) => w.active !== false)
        .sort((a, b) => a.position - b.position)
    )
  ),

  http.post(`${BASE}/dashboard-widgets`, async ({ request }) => {
    const body = await request.json() as Record<string, unknown>
    const now = new Date().toISOString()
    const widget = {
      position: mockDashboardWidgets.length,
      ...body,
      id: crypto.randomUUID(),
      active: true,
      createdAt: now,
      updatedAt: now,
    } as (typeof mockDashboardWidgets)[number]
    mockDashboardWidgets.push(widget)
    return HttpResponse.json(widget, { status: 201 })
  }),

  http.patch(`${BASE}/dashboard-widgets/:id`, async ({ params, request }) => {
    const widget = mockDashboardWidgets.find((w) => w.id === params['id'])
    if (!widget) return new HttpResponse(null, { status: 404 })
    const body = await request.json() as Record<string, unknown>
    Object.assign(widget, body, { updatedAt: new Date().toISOString() })
    return HttpResponse.json(widget)
  }),

  http.delete(`${BASE}/dashboard-widgets/:id`, ({ params }) => {
    const widget = mockDashboardWidgets.find((w) => w.id === params['id'])
    if (!widget) return new HttpResponse(null, { status: 404 })
    widget.active = false
    widget.updatedAt = new Date().toISOString()
    return new HttpResponse(null, { status: 204 })
  }),

  // ─── Recortes (indicadores de recorte dinámicos) ────────
  http.get(`${BASE}/recortes`, () =>
    HttpResponse.json(
      mockRecortes
        .filter((r) => r.active !== false)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    )
  ),

  http.get(`${BASE}/recortes/:id`, ({ params }) => {
    const recorte = mockRecortes.find((r) => r.id === params['id'])
    if (!recorte) return new HttpResponse(null, { status: 404 })
    return HttpResponse.json(recorte)
  }),

  http.post(`${BASE}/recortes`, async ({ request }) => {
    const body = await request.json() as Record<string, unknown>
    const now = new Date().toISOString()
    const recorte = {
      ...body,
      id: crypto.randomUUID(),
      active: true,
      createdAt: now,
      updatedAt: now,
    } as (typeof mockRecortes)[number]
    mockRecortes.push(recorte)
    return HttpResponse.json(recorte, { status: 201 })
  }),

  http.patch(`${BASE}/recortes/:id`, async ({ params, request }) => {
    const recorte = mockRecortes.find((r) => r.id === params['id'])
    if (!recorte) return new HttpResponse(null, { status: 404 })
    const body = await request.json() as Record<string, unknown>
    Object.assign(recorte, body, { updatedAt: new Date().toISOString() })
    return HttpResponse.json(recorte)
  }),

  http.delete(`${BASE}/recortes/:id`, ({ params }) => {
    const recorte = mockRecortes.find((r) => r.id === params['id'])
    if (!recorte) return new HttpResponse(null, { status: 404 })
    recorte.active = false
    recorte.updatedAt = new Date().toISOString()
    return new HttpResponse(null, { status: 204 })
  }),

  http.get(`${BASE}/recortes/:id/results`, ({ params }) => {
    const id = params['id'] as string
    const results = (mockRecorteResults[id] ?? [])
      .slice()
      .sort((a, b) => b.generatedAt.localeCompare(a.generatedAt))
    return HttpResponse.json(results)
  }),

  http.post(`${BASE}/recortes/:id/results`, async ({ params, request }) => {
    const id = params['id'] as string
    const body = await request.json() as Record<string, unknown>
    const result = { ...body, id: crypto.randomUUID() } as (typeof mockRecorteResults)[string][number]
    mockRecorteResults[id] = [result, ...(mockRecorteResults[id] ?? [])]
    const recorte = mockRecortes.find((r) => r.id === id)
    if (recorte) {
      recorte.lastResult = result
      recorte.updatedAt = new Date().toISOString()
    }
    return HttpResponse.json(result, { status: 201 })
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
    const now = new Date()
    let month = now.getMonth() + 1
    let year = now.getFullYear()
    if (contentType.includes('multipart/form-data')) {
      const form = await request.formData()
      amount = parseFloat(form.get('amount') as string) || amount
      if (form.get('month')) month = parseInt(form.get('month') as string)
      if (form.get('year')) year = parseInt(form.get('year') as string)
    } else {
      const body = await request.json() as Record<string, unknown>
      amount = (body['amount'] as number) ?? amount
      if (body['month']) month = body['month'] as number
      if (body['year']) year = body['year'] as number
    }
    const history = {
      id: crypto.randomUUID(),
      month,
      year,
      amount,
      currency: rec?.currency ?? Currency.UYU,
      paidAt: now.toISOString(),
      status: RecurringPaymentStatus.Paid,
    }
    if (rec) {
      // A real payment supersedes a prior skip for the same period.
      const kept = (rec.paymentHistory ?? []).filter(
        (h) => !(h.month === month && h.year === year && h.status === RecurringPaymentStatus.Skipped),
      )
      rec.paymentHistory = [history, ...kept]
      rec.currentMonthStatus = RecurringPaymentStatus.Paid
    }
    return HttpResponse.json(history, { status: 201 })
  }),

  http.post(`${BASE}/recurring/:id/skip-month`, async ({ params, request }) => {
    const rec = mockRecurring.find((r) => r.id === params['id'])
    if (!rec) return new HttpResponse(null, { status: 404 })
    const { month, year } = await request.json() as { month: number; year: number }
    const already = rec.paymentHistory.find((h) => h.month === month && h.year === year)
    if (already?.status === RecurringPaymentStatus.Paid) {
      return HttpResponse.json({ message: 'Este mes ya está pagado' }, { status: 409 })
    }
    if (!already || already.status !== RecurringPaymentStatus.Skipped) {
      rec.paymentHistory = [
        { id: crypto.randomUUID(), month, year, amount: 0, currency: rec.currency, status: RecurringPaymentStatus.Skipped },
        ...rec.paymentHistory,
      ]
    }
    const now = new Date()
    if (month === now.getMonth() + 1 && year === now.getFullYear()) {
      rec.currentMonthStatus = RecurringPaymentStatus.Skipped
    }
    return HttpResponse.json(rec)
  }),

  http.post(`${BASE}/recurring/:id/unskip-month`, async ({ params, request }) => {
    const rec = mockRecurring.find((r) => r.id === params['id'])
    if (!rec) return new HttpResponse(null, { status: 404 })
    const { month, year } = await request.json() as { month: number; year: number }
    rec.paymentHistory = rec.paymentHistory.filter(
      (h) => !(h.month === month && h.year === year && h.status === RecurringPaymentStatus.Skipped),
    )
    const now = new Date()
    if (month === now.getMonth() + 1 && year === now.getFullYear()) {
      rec.currentMonthStatus =
        rec.mode === RecurringMode.Auto ? RecurringPaymentStatus.Paid : RecurringPaymentStatus.Pending
    }
    return HttpResponse.json(rec)
  }),

  http.patch(`${BASE}/recurring/:id/payments/:paymentId`, async ({ params, request }) => {
    const rec = mockRecurring.find((r) => r.id === params['id'])
    const paymentId = params['paymentId'] as string
    const body = await request.json() as { amount?: number; paidAt?: string }
    let entry: (typeof mockRecurring)[number]['paymentHistory'][number] | undefined
    if (rec) {
      rec.paymentHistory = rec.paymentHistory.map((h) => {
        if (h.id === paymentId) {
          entry = { ...h, ...(body.amount !== undefined ? { amount: body.amount } : {}), ...(body.paidAt ? { paidAt: body.paidAt } : {}) }
          return entry
        }
        return h
      })
    }
    if (!entry) return new HttpResponse(null, { status: 404 })
    return HttpResponse.json(entry)
  }),

  http.post(`${BASE}/recurring/:id/payments/:paymentId/receipt`, async ({ params }) => {
    const rec = mockRecurring.find((r) => r.id === params['id'])
    const paymentId = params['paymentId'] as string
    const receiptUrl = `https://storage.example.com/receipts/mock-${paymentId}.jpg`
    if (rec) {
      rec.paymentHistory = rec.paymentHistory.map((h) =>
        h.id === paymentId ? { ...h, receiptUrl } : h,
      )
    }
    return HttpResponse.json({ receiptUrl })
  }),

  // ─── Budget ──────────────────────────────────────────────
  http.get(`${BASE}/budget`, () => HttpResponse.json(mockBudget)),

  http.put(`${BASE}/budget`, async ({ request }) => {
    const body = await request.json() as Record<string, unknown>
    if (typeof body['usd'] === 'number' || body['usd'] === null) mockBudget.usd = body['usd'] as number | undefined
    if (typeof body['uyu'] === 'number' || body['uyu'] === null) mockBudget.uyu = body['uyu'] as number | undefined
    return HttpResponse.json(mockBudget)
  }),

  // ─── Product category limits ─────────────────────────────
  http.get(`${BASE}/product-category-limits`, () => HttpResponse.json(mockProductCategoryLimits)),
  http.put(`${BASE}/product-category-limits`, async ({ request }) => {
    const body = await request.json() as Record<string, unknown>
    for (const key of Object.keys(mockProductCategoryLimits)) delete mockProductCategoryLimits[key]
    Object.assign(mockProductCategoryLimits, body)
    return HttpResponse.json(mockProductCategoryLimits)
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
      } else if (p === 'lastMonth') {
        return { start: new Date(now.getFullYear(), now.getMonth() - 1, 1), end: new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999) }
      } else if (p === '3m') {
        const start = new Date(now); start.setMonth(start.getMonth() - 3); start.setHours(0, 0, 0, 0)
        const end = new Date(now); end.setHours(23, 59, 59, 999)
        return { start, end }
      } else if (p === '6m') {
        const start = new Date(now); start.setMonth(start.getMonth() - 6); start.setHours(0, 0, 0, 0)
        const end = new Date(now); end.setHours(23, 59, 59, 999)
        return { start, end }
      } else if (p === 'year') {
        return { start: new Date(now.getFullYear(), 0, 1), end: new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999) }
      } else if (p === 'all') {
        return { start: new Date(0), end: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999) }
      }
      return null
    }

    function computeMetrics(filtered: typeof mockExpenses): { totalUsd: number; totalUyu: number; byCategory: CategorySpend[]; byProductCategory: ProductCategorySpend[] } {
      const totalUsd = filtered.filter((e) => e.currency === 'USD').reduce((s, e) => s + e.amount, 0)
      const totalUyu = filtered.filter((e) => e.currency === 'UYU').reduce((s, e) => s + e.amount, 0)
      const catMap = new Map(mockCategories.map((c) => [c.id, c]))
      const byCategoryMap = new Map<
        string,
        { usd: number; uyu: number; expenseCount: number; expenseCountUsd: number; expenseCountUyu: number }
      >()
      for (const exp of filtered) {
        // Rollup a la jerarquía: acreditar cada categoría + su padre, deduplicado por gasto
        const targets = new Set<string>()
        for (const catId of exp.categoryIds) {
          targets.add(catId)
          const parentId = catMap.get(catId)?.parentId
          if (parentId) targets.add(parentId)
        }
        for (const catId of targets) {
          const entry = byCategoryMap.get(catId) ?? { usd: 0, uyu: 0, expenseCount: 0, expenseCountUsd: 0, expenseCountUyu: 0 }
          if (exp.currency === 'USD') { entry.usd += exp.amount; entry.expenseCountUsd += 1 }
          else { entry.uyu += exp.amount; entry.expenseCountUyu += 1 }
          entry.expenseCount += 1
          byCategoryMap.set(catId, entry)
        }
      }
      const byCategory = [...byCategoryMap.entries()]
        .map(([catId, totals]) => {
          const cat = catMap.get(catId)
          return { categoryId: catId, categoryName: cat?.name ?? catId, categoryIcon: cat?.icon ?? '📦', parentId: cat?.parentId, ...totals }
        })
        .sort((a, b) => (b.usd + b.uyu) - (a.usd + a.uyu))
      const productMap = new Map(mockUserProducts.map((p) => [p.id, p]))
      const pcatMap = new Map(mockProductCategories.map((c) => [c.id, c]))
      const byProductCategoryMap = new Map<string, { usd: number; uyu: number }>()
      for (const exp of filtered) {
        for (const line of exp.ticketLines) {
          if (!line.productId) continue
          const product = productMap.get(line.productId)
          if (!product) continue
          const entry = byProductCategoryMap.get(product.productCategoryId) ?? { usd: 0, uyu: 0 }
          if (exp.currency === 'USD') entry.usd += line.amount
          else entry.uyu += line.amount
          byProductCategoryMap.set(product.productCategoryId, entry)
        }
      }
      // Merge dynamic data on top of mock baseline
      const byProductCategory = mockMetrics.byProductCategory.map((base) => {
        const dynamic = byProductCategoryMap.get(base.productCategoryId)
        return dynamic
          ? { ...base, usd: base.usd + dynamic.usd, uyu: base.uyu + dynamic.uyu }
          : base
      })
      // Add any dynamically found categories not in the mock baseline
      for (const [pcatId, totals] of byProductCategoryMap.entries()) {
        if (!byProductCategory.find((b) => b.productCategoryId === pcatId)) {
          const pcat = pcatMap.get(pcatId)
          byProductCategory.push({ productCategoryId: pcatId, productCategoryName: pcat?.name ?? pcatId, productCategoryIcon: pcat?.icon ?? '📦', ...totals })
        }
      }
      byProductCategory.sort((a, b) => (b.usd + b.uyu) - (a.usd + a.uyu))

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

  http.delete(`${BASE}/product-categories/:id`, ({ params }) => {
    const cat = mockProductCategories.find((c) => c.id === params['id'])
    if (cat) Object.assign(cat, { active: false, updatedAt: new Date().toISOString() })
    return new HttpResponse(null, { status: 204 })
  }),

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

  // ─── Month analysis ──────────────────────────────────────
  http.get(`${BASE}/month-analysis/:yearMonth`, ({ params }) => {
    const analysis = mockMonthAnalyses.find((a) => a.yearMonth === params['yearMonth'])
    if (!analysis) return new HttpResponse(null, { status: 404 })
    return HttpResponse.json(analysis)
  }),

  http.put(`${BASE}/month-analysis/:yearMonth`, async ({ params, request }) => {
    const body = await request.json() as MonthAnalysis
    const idx = mockMonthAnalyses.findIndex((a) => a.yearMonth === params['yearMonth'])
    if (idx !== -1) {
      mockMonthAnalyses[idx] = body
    } else {
      mockMonthAnalyses.push(body)
    }
    return HttpResponse.json(body)
  }),

  // ─── User preferences ────────────────────────────────────
  http.get(`${BASE}/user-prefs`, () => HttpResponse.json(mockUserPrefs)),

  http.patch(`${BASE}/user-prefs`, async ({ request }) => {
    const body = await request.json() as Record<string, unknown>
    Object.assign(mockUserPrefs, body)
    return HttpResponse.json(mockUserPrefs)
  }),

  // ─── Integraciones ───────────────────────────────────────
  http.get(`${BASE}/integrations/gmail`, () => HttpResponse.json(mockGmailIntegration)),

  http.patch(`${BASE}/integrations/gmail`, async ({ request }) => {
    const body = await request.json() as Record<string, unknown>
    Object.assign(mockGmailIntegration, body)
    return HttpResponse.json(mockGmailIntegration)
  }),

  // ─── Gmail: cola de import (pendientes + vistos) ─────────
  http.get(`${BASE}/integrations/gmail/queue`, () => HttpResponse.json(mockGmailQueue)),

  http.post(`${BASE}/integrations/gmail/queue/seen`, async ({ request }) => {
    const { ids } = (await request.json()) as { ids: string[] }
    const set = new Set([...mockGmailQueue.seenIds, ...ids])
    mockGmailQueue.seenIds = [...set]
    return HttpResponse.json(mockGmailQueue)
  }),

  http.post(`${BASE}/integrations/gmail/queue/pending`, async ({ request }) => {
    const { items } = (await request.json()) as { items: GmailPendingItem[] }
    const byId = new Map(mockGmailQueue.pending.map((p) => [p.gmailMessageId, p]))
    for (const item of items) if (!byId.has(item.gmailMessageId)) byId.set(item.gmailMessageId, item)
    mockGmailQueue.pending = [...byId.values()]
    return HttpResponse.json(mockGmailQueue)
  }),

  http.post(`${BASE}/integrations/gmail/queue/pending/remove`, async ({ request }) => {
    const { messageIds } = (await request.json()) as { messageIds: string[] }
    const remove = new Set(messageIds)
    mockGmailQueue.pending = mockGmailQueue.pending.filter((p) => !remove.has(p.gmailMessageId))
    return HttpResponse.json(mockGmailQueue)
  }),

  // ─── Gmail (fetch de mails mockeado) ─────────────────────
  http.get(`${BASE}/gmail/labels`, () => HttpResponse.json(mockGmailLabels)),

  http.post(`${BASE}/gmail/messages`, async ({ request }) => {
    const { senders, seenIds } = (await request.json()) as {
      senders?: string[]
      labels?: string[]
      windowDays?: number
      seenIds?: string[]
    }
    // Filtro liviano por remitente para simular la búsqueda; si no matchea nada
    // (o no hay remitentes configurados) devuelve todos para que dev vea datos.
    const bySender = senders?.length
      ? mockGmailMessages.filter((m) =>
          senders.some((s) => m.from.toLowerCase().includes(s.toLowerCase())),
        )
      : mockGmailMessages
    const base = bySender.length ? bySender : mockGmailMessages
    // Excluye los ya vistos, como haría Gmail al filtrar por IDs antes de bajar cuerpos.
    const seen = new Set(seenIds ?? [])
    return HttpResponse.json(base.filter((m) => !seen.has(m.id)))
  }),

  // ─── Gemini AI (category suggestion + statement parsing mock) ─
  // Intercepts all Gemini model variants (2.0-flash, 2.5-flash, etc.)
  http.post(/https:\/\/generativelanguage\.googleapis\.com\/v1beta\/models\/gemini-.+:generateContent/, async ({ request }) => {
    const body = await request.json() as { contents?: { parts?: ({ text?: string } | { inlineData?: { mimeType?: string } })[] }[] }
    const parts = body.contents?.[0]?.parts ?? []
    const hasImage = parts.some((p) => 'inlineData' in p && (p as { inlineData?: { mimeType?: string } }).inlineData?.mimeType?.startsWith('image/'))
    const hasPdf = parts.some((p) => 'inlineData' in p && (p as { inlineData?: { mimeType?: string } }).inlineData?.mimeType === 'application/pdf')

    if (hasImage) {
      // Receipt analysis mock — returns place and category names for resolution
      const receiptResult = {
        description: 'Supermercado Devoto',
        amount: 1250,
        currency: 'UYU',
        date: new Date().toISOString().split('T')[0],
        placeName: 'Devoto',
        categoryNames: ['Supermercado', 'Alimentación'],
        confidence: 'high',
      }
      return HttpResponse.json({
        candidates: [{ content: { parts: [{ text: JSON.stringify(receiptResult) }] } }],
      })
    }

    if (hasPdf) {
      // Statement parsing mock — return sample transaction lines
      const lines = [
        { date: new Date().toISOString().split('T')[0], description: 'MERCADOPAGO*UBER', amount: 350, currency: 'UYU', suggestedCategoryName: 'Transporte' },
        { date: new Date().toISOString().split('T')[0], description: 'SUPERMERCADO DISCO', amount: 2400, currency: 'UYU', suggestedCategoryName: 'Supermercado' },
        { date: new Date().toISOString().split('T')[0], description: 'NETFLIX.COM', amount: 6.99, currency: 'USD', suggestedCategoryName: 'Entretenimiento' },
        { date: new Date().toISOString().split('T')[0], description: 'FARMASHOP S.A.', amount: 780, currency: 'UYU', suggestedCategoryName: 'Salud' },
        { date: new Date().toISOString().split('T')[0], description: 'ANTEL MOVIL', amount: 1200, currency: 'UYU', suggestedCategoryName: 'Servicios' },
      ]
      return HttpResponse.json({
        candidates: [{ content: { parts: [{ text: JSON.stringify({ lines }) }] } }],
      })
    }

    const promptText = parts.find((p): p is { text: string } => 'text' in p)?.text ?? ''

    // Gmail: parse de avisos de compra por email → gastos candidatos.
    // Devuelve líneas para los 3 mails mock (ver data/gmailMessages.ts).
    if (promptText.includes('avisos de compra recibidos por email')) {
      const lines = [
        { gmailMessageId: 'gmail-msg-1', date: '2026-07-19', description: 'TIENDA INGLESA', amount: 1234, currency: 'UYU', suggestedCategoryName: 'Supermercado' },
        { gmailMessageId: 'gmail-msg-2', date: '2026-07-17', description: 'NETFLIX.COM', amount: 29.99, currency: 'USD', suggestedCategoryName: 'Entretenimiento' },
        { gmailMessageId: 'gmail-msg-3', date: '2026-07-15', description: 'DEVOTO EXPRESS', amount: 560, currency: 'UYU', suggestedCategoryName: 'Supermercado' },
        // Duplicados en lote (mismo monto+moneda+fecha, distinto remitente).
        { gmailMessageId: 'gmail-msg-4', date: '2026-07-16', description: 'PEDIDOSYA', amount: 850, currency: 'UYU', suggestedCategoryName: 'Restaurantes' },
        { gmailMessageId: 'gmail-msg-5', date: '2026-07-16', description: 'MERPAGO*PEDIDOSYA', amount: 850, currency: 'UYU', suggestedCategoryName: 'Restaurantes' },
      ]
      return HttpResponse.json({
        candidates: [{ content: { parts: [{ text: JSON.stringify({ lines }) }] } }],
      })
    }

    // Monthly analysis prompt
    if (promptText.includes('análisis mensual')) {
      const mockAnalysis = {
        summary: 'Este mes te fuiste bastante en Supermercado y Restaurantes, que juntos se llevaron más de la mitad del gasto total. Los servicios fijos se mantuvieron estables.',
        unnecessary: {
          insights: [{ category: 'Restaurantes', insight: 'Varias salidas en días de semana que se podrían reemplazar con algo cocinado en casa.' }],
          note: '',
        },
        reducible: {
          insights: [{ category: 'Suscripciones', insight: 'Revisá si todas las suscripciones activas las estás usando de verdad.' }],
          note: '',
        },
        preventable: 'No hubo gastos excepcionales fuera de lo normal. El patrón es bastante consistente, así que es buen momento para ajustar algún hábito.',
      }
      return HttpResponse.json({
        candidates: [{ content: { parts: [{ text: JSON.stringify(mockAnalysis) }] } }],
      })
    }

    // Recorte: diseño del indicador a partir del prompt del usuario (draft/preview)
    if (promptText.includes('Diseñá un indicador de recorte')) {
      const draft = {
        name: 'Gasto hormiga',
        description: 'Compras chicas y frecuentes que suman más de lo que parece.',
        icon: '🐜',
        color: '#ff7043',
        outputFormat: 'amount',
      }
      return HttpResponse.json({
        candidates: [{ content: { parts: [{ text: JSON.stringify(draft) }] } }],
      })
    }

    // Recorte: cálculo del resultado del indicador
    if (promptText.includes('Calculá el resultado del indicador de recorte')) {
      const fmt = promptText.match(/Formato de salida:\s*(\w+)/)?.[1] ?? 'text'
      const byFormat: Record<string, unknown> = {
        amount: {
          amount: 3600,
          currency: 'UYU',
          text: 'Estimación sobre los gastos del período seleccionado.',
        },
        list: {
          items: [
            { label: 'Restaurantes', detail: 'Subió respecto al período anterior.', amount: 2100, currency: 'UYU' },
            { label: 'Delivery', detail: 'Muchas compras chicas.', amount: 1500, currency: 'UYU' },
          ],
        },
        badge: {
          badge: { level: 'warning', label: 'Atención — gasto en alza' },
          text: 'El gasto variable creció respecto al período anterior.',
        },
        text: {
          text: 'Según los datos del período, tu gasto se concentra en pocas categorías; recortar la de mayor peso tendría impacto directo.',
        },
      }
      return HttpResponse.json({
        candidates: [{ content: { parts: [{ text: JSON.stringify(byFormat[fmt] ?? byFormat['text']) }] } }],
      })
    }

    // Extract expense or product name from prompt
    const expenseMatch = promptText.match(/Nombre del gasto: "([^"]+)"/)
    const productMatch = promptText.match(/Nombre del producto: "([^"]+)"/)
    const expenseName = (expenseMatch?.[1] ?? productMatch?.[1] ?? '').toLowerCase()

    // Simple keyword-based mock responses
    let result: { matches: string[]; suggestions: { name: string; icon: string; color: string; monthlyLimit?: number }[] }

    if (expenseName.includes('super') || expenseName.includes('mercado') || expenseName.includes('almacén')) {
      result = { matches: [], suggestions: [{ name: 'Supermercado', icon: '🛒', color: '#4caf50' }, { name: 'Alimentación', icon: '🥦', color: '#66bb6a' }] }
    } else if (expenseName.includes('restau') || expenseName.includes('lunch') || expenseName.includes('pizza') || expenseName.includes('sushi')) {
      result = { matches: [], suggestions: [{ name: 'Restaurantes', icon: '🍽️', color: '#ff7043' }, { name: 'Salidas', icon: '🎉', color: '#ffa726' }] }
    } else if (expenseName.includes('farmacia') || expenseName.includes('medicamento') || expenseName.includes('farmac')) {
      result = { matches: [], suggestions: [{ name: 'Salud', icon: '💊', color: '#42a5f5' }] }
    } else if (expenseName.includes('uber') || expenseName.includes('taxi') || expenseName.includes('bus') || expenseName.includes('nafta')) {
      result = { matches: [], suggestions: [{ name: 'Transporte', icon: '🚗', color: '#7e57c2' }] }
    } else {
      result = { matches: [], suggestions: [{ name: 'Varios', icon: '📦', color: '#90a4ae' }] }
    }

    const responseText = JSON.stringify(result)
    return HttpResponse.json({
      candidates: [{ content: { parts: [{ text: responseText }] } }],
    })
  }),

  // ── Report attachments ───────────────────────────────────
  http.get(`${BASE}/report-attachments`, ({ request }) => {
    const url = new URL(request.url)
    const yearMonth = url.searchParams.get('yearMonth') ?? ''
    return HttpResponse.json(mockReportAttachments.filter((a) => a.yearMonth === yearMonth))
  }),

  http.get(`${BASE}/report-attachments/:id`, ({ params }) => {
    const att = mockReportAttachments.find((a) => a.id === params.id)
    if (!att) return new HttpResponse(null, { status: 404 })
    return HttpResponse.json(att)
  }),

  http.post(`${BASE}/report-attachments`, async ({ request }) => {
    const form = await request.formData()
    const yearMonth = (form.get('yearMonth') as string) ?? ''
    const file = form.get('file') as File | null
    const cardId = (form.get('cardId') as string | null) ?? undefined
    const now = new Date().toISOString()
    const newAtt = {
      id: `att-${Date.now()}`,
      yearMonth,
      name: file?.name ?? 'archivo',
      url: `https://example.com/mock/${file?.name ?? 'archivo'}`,
      mimeType: file?.type ?? 'application/octet-stream',
      size: file?.size ?? 0,
      uploadedAt: now,
      processed: false,
      ...(cardId ? { cardId } : {}),
    }
    mockReportAttachments.push(newAtt)
    return HttpResponse.json(newAtt, { status: 201 })
  }),

  http.patch(`${BASE}/report-attachments/:id/pending-lines`, async ({ params, request }) => {
    const att = mockReportAttachments.find((a) => a.id === params.id)
    if (!att) return new HttpResponse(null, { status: 404 })
    const body = await request.json() as { lines: unknown[] }
    const now = new Date().toISOString()
    Object.assign(att, { pendingLines: body.lines, pendingLinesAt: now })
    return HttpResponse.json(att)
  }),

  http.patch(`${BASE}/report-attachments/:id/mark-processed`, async ({ params, request }) => {
    const att = mockReportAttachments.find((a) => a.id === params.id)
    if (!att) return new HttpResponse(null, { status: 404 })
    const body = await request.json() as { importedExpenseCount: number }
    const now = new Date().toISOString()
    Object.assign(att, { processed: true, processedAt: now, importedExpenseCount: body.importedExpenseCount })
    return HttpResponse.json(att)
  }),

  http.delete(`${BASE}/report-attachments/:id`, ({ params }) => {
    const idx = mockReportAttachments.findIndex((a) => a.id === params.id)
    if (idx !== -1) mockReportAttachments.splice(idx, 1)
    return new HttpResponse(null, { status: 204 })
  }),

  // ── Pending receipts ─────────────────────────────────────
  http.get(`${BASE}/pending-receipts`, () => HttpResponse.json(mockPendingReceipts)),

  http.post(`${BASE}/pending-receipts`, async ({ request }) => {
    const form = await request.formData()
    const file = form.get('file') as File | null
    const now = new Date().toISOString()
    const newReceipt = {
      id: `receipt-${Date.now()}`,
      imageUrl: `https://via.placeholder.com/400x600?text=${encodeURIComponent(file?.name ?? 'comprobante')}`,
      status: ReceiptStatus.Pending,
      createdAt: now,
      updatedAt: now,
    }
    mockPendingReceipts.unshift(newReceipt)
    return HttpResponse.json(newReceipt, { status: 201 })
  }),

  http.patch(`${BASE}/pending-receipts/:id`, async ({ params, request }) => {
    const receipt = mockPendingReceipts.find((r) => r.id === params.id)
    if (!receipt) return new HttpResponse(null, { status: 404 })
    const body = await request.json() as Record<string, unknown>
    Object.assign(receipt, { ...body, updatedAt: new Date().toISOString() })
    return HttpResponse.json(receipt)
  }),

  http.delete(`${BASE}/pending-receipts/:id`, ({ params }) => {
    const idx = mockPendingReceipts.findIndex((r) => r.id === params.id)
    if (idx !== -1) mockPendingReceipts.splice(idx, 1)
    return new HttpResponse(null, { status: 204 })
  }),
]
