// src/tests/mocks/handlers.ts

import { http, HttpResponse } from 'msw'
import { mockExpenses } from './data/expenses'
import { mockCategories } from './data/categories'
import { mockPlaces } from './data/places'
import { mockCards } from './data/cards'
import { mockRecurring } from './data/recurring'
import { mockMetrics } from './data/metrics'
import { mockSalaries } from './data/salaries'
import { mockBudget } from './data/budget'
import { mockMonthClosings } from './data/monthClosings'

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
  http.get(`${BASE}/expenses`, () => HttpResponse.json({
    data: mockExpenses,
    total: mockExpenses.length,
    page: 1,
    pageSize: 20,
  })),

  http.get(`${BASE}/expenses/:id`, ({ params }) => {
    const expense = mockExpenses.find((e) => e.id === params['id'])
    if (!expense) return new HttpResponse(null, { status: 404 })
    return HttpResponse.json(expense)
  }),

  http.post(`${BASE}/expenses`, async ({ request }) => {
    const body = await request.json() as Record<string, unknown>
    const created = { ...body, id: crypto.randomUUID(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), ticketLines: [] }
    return HttpResponse.json(created, { status: 201 })
  }),

  http.patch(`${BASE}/expenses/:id`, async ({ params, request }) => {
    const expense = mockExpenses.find((e) => e.id === params['id'])
    if (!expense) return new HttpResponse(null, { status: 404 })
    const body = await request.json() as Record<string, unknown>
    return HttpResponse.json({ ...expense, ...body, updatedAt: new Date().toISOString() })
  }),

  http.delete(`${BASE}/expenses/:id`, () => new HttpResponse(null, { status: 204 })),

  http.post(`${BASE}/expenses/:id/ticket-lines`, async ({ request }) => {
    const body = await request.json() as Record<string, unknown>
    return HttpResponse.json({ ...body, id: crypto.randomUUID() }, { status: 201 })
  }),

  http.delete(`${BASE}/expenses/:id/ticket-lines/:lineId`, () =>
    new HttpResponse(null, { status: 204 })
  ),

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

  http.post(`${BASE}/recurring/:id/confirm-payment`, () =>
    HttpResponse.json({
      id: crypto.randomUUID(),
      month: new Date().getMonth() + 1,
      year: new Date().getFullYear(),
      amount: 890,
      currency: 'UYU',
      paidAt: new Date().toISOString(),
      status: 'paid',
    }, { status: 201 })
  ),

  // ─── Budget ──────────────────────────────────────────────
  http.get(`${BASE}/budget`, () => HttpResponse.json(mockBudget)),

  http.put(`${BASE}/budget`, async ({ request }) => {
    const body = await request.json() as Record<string, unknown>
    if (typeof body['usd'] === 'number' || body['usd'] === null) mockBudget.usd = body['usd'] as number | undefined
    if (typeof body['uyu'] === 'number' || body['uyu'] === null) mockBudget.uyu = body['uyu'] as number | undefined
    return HttpResponse.json(mockBudget)
  }),

  // ─── Metrics ────────────────────────────────────────────
  http.get(`${BASE}/metrics`, () => HttpResponse.json(mockMetrics)),

  // ─── Salaries ────────────────────────────────────────────
  http.get(`${BASE}/salaries`, () => HttpResponse.json(mockSalaries)),

  http.post(`${BASE}/salaries`, async ({ request }) => {
    const body = await request.json() as Record<string, unknown>
    const created = { ...body, id: crypto.randomUUID(), createdAt: new Date().toISOString() }
    mockSalaries.unshift(created as typeof mockSalaries[0])
    return HttpResponse.json(created, { status: 201 })
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
]
