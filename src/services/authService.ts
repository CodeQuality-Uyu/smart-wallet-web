// src/services/authService.ts
// Thin delegator — all logic lives in the active backend implementation.

import { getAuthBackend } from '@/backend'
import type { AuthResponse, LoginResult, SessionUser } from '@/backend/types'

export type { SessionUser, AuthResponse, LoginResult }

export const authService = {
  async login(email: string, password: string): Promise<LoginResult> {
    return (await getAuthBackend()).login(email, password)
  },

  async register(name: string, email: string, password: string): Promise<void> {
    return (await getAuthBackend()).register(name, email, password)
  },

  async verifyCode(email: string, code: string): Promise<AuthResponse> {
    return (await getAuthBackend()).verifyCode(email, code)
  },

  async resetPassword(email: string): Promise<void> {
    return (await getAuthBackend()).resetPassword(email)
  },
}
