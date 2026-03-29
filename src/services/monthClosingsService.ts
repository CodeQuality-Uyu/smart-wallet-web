// src/services/monthClosingsService.ts
import { getMonthClosingsBackend } from '@/backend'
import type { MonthClosing, CreateMonthClosingPayload } from '@/types/models'

export const monthClosingsService = {
  async list(): Promise<MonthClosing[]> {
    return (await getMonthClosingsBackend()).list()
  },
  async getById(id: string): Promise<MonthClosing | null> {
    return (await getMonthClosingsBackend()).getById(id)
  },
  async create(payload: CreateMonthClosingPayload): Promise<MonthClosing> {
    return (await getMonthClosingsBackend()).create(payload)
  },
}
