// src/backend/types.ts
// Shared interfaces for all backend implementations (msw, firestore, aws)

import type { Card, CreateCardPayload, UpdateCardPayload } from '@/types/models'

export type { Card, CreateCardPayload, UpdateCardPayload }

// ─── Auth ──────────────────────────────────────────────────

export interface SessionUser {
  id: string
  email: string
  name: string
}

export interface AuthResponse {
  token: string
  user: SessionUser
}

/**
 * login returns:
 *  - { authenticated: true, token, user } → session started, navigate to /home
 *  - { authenticated: false }             → email link/code sent, navigate to /verify-code
 */
export type LoginResult =
  | { authenticated: true; token: string; user: SessionUser }
  | { authenticated: false }

export interface IAuthBackend {
  login(email: string, password: string): Promise<LoginResult>
  register(name: string, email: string, password: string): Promise<void>
  verifyCode(email: string, code: string): Promise<AuthResponse>
  resetPassword(email: string): Promise<void>
}

// ─── Cards / Payment methods ──────────────────────────────

export interface ICardsBackend {
  list(): Promise<Card[]>
  create(payload: CreateCardPayload): Promise<Card>
  update(id: string, payload: UpdateCardPayload): Promise<Card>
  remove(id: string): Promise<void>
}

// ─── Salaries ─────────────────────────────────────────────

export interface Salary {
  id: string
  amount: number
  currency: string
  date: string
  notes: string
  createdAt: string
}

export interface CreateSalaryPayload {
  amount: number
  currency: string
  date: string
  notes: string
}

export interface ISalariesBackend {
  list(): Promise<Salary[]>
  create(payload: CreateSalaryPayload): Promise<Salary>
  remove(id: string): Promise<void>
}
