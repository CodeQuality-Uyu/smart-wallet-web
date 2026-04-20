// src/backend/msw/auth.ts
// Auth backend implemented via the MSW-intercepted HTTP adapter (httpClient → axios)

import { httpClient } from '@/api/httpClient'
import type { IAuthBackend, AuthResponse, LoginResult, SocialAuthResult } from '../types'

export const mswAuthBackend: IAuthBackend = {
  async login(email: string, password: string): Promise<LoginResult> {
    const { data } = await httpClient.post<AuthResponse>('/auth/login', { email, password })
    return { authenticated: true, token: data.token, user: data.user }
  },

  async register(name: string, email: string, password: string): Promise<void> {
    await httpClient.post('/auth/register', { name, email, password })
  },

  async verifyCode(email: string, code: string): Promise<AuthResponse> {
    const { data } = await httpClient.post<AuthResponse>('/auth/verify', { email, code })
    return data
  },

  async resetPassword(_email: string): Promise<void> {
    // No-op in MSW demo mode
  },

  async loginWithGoogle(): Promise<SocialAuthResult> {
    const { data } = await httpClient.post<SocialAuthResult>('/auth/google', {})
    return data
  },

  async sendMagicLink(email: string): Promise<void> {
    await httpClient.post('/auth/magic-link/send', { email })
  },

  async confirmMagicLink(email: string): Promise<SocialAuthResult> {
    const { data } = await httpClient.post<SocialAuthResult>('/auth/magic-link/confirm', { email })
    return data
  },
}
