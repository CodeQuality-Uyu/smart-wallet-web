// src/backend/msw/monthClosings.ts
import { httpClient } from '@/api/httpClient'
import type { IMonthClosingsBackend, MonthClosing, CreateMonthClosingPayload } from '../types'

export const mswMonthClosingsBackend: IMonthClosingsBackend = {
  async list(): Promise<MonthClosing[]> {
    const { data } = await httpClient.get<MonthClosing[]>('/month-closings')
    return data
  },
  async getById(id: string): Promise<MonthClosing | null> {
    try {
      const { data } = await httpClient.get<MonthClosing>(`/month-closings/${id}`)
      return data
    } catch {
      return null
    }
  },
  async create(payload: CreateMonthClosingPayload): Promise<MonthClosing> {
    const { data } = await httpClient.post<MonthClosing>('/month-closings', payload)
    return data
  },
}
