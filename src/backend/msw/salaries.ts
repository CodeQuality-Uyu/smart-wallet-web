// src/backend/msw/salaries.ts
// Salaries backend implemented via the MSW-intercepted HTTP adapter

import { httpClient } from '@/api/httpClient'
import type { ISalariesBackend, Salary, CreateSalaryPayload, UpdateSalaryPayload } from '../types'

export const mswSalariesBackend: ISalariesBackend = {
  async list(): Promise<Salary[]> {
    const { data } = await httpClient.get<Salary[]>('/salaries')
    return data
  },

  async create(payload: CreateSalaryPayload): Promise<Salary> {
    const { data } = await httpClient.post<Salary>('/salaries', payload)
    return data
  },

  async update(id: string, payload: UpdateSalaryPayload): Promise<Salary> {
    const { data } = await httpClient.patch<Salary>(`/salaries/${id}`, payload)
    return data
  },

  async remove(id: string): Promise<void> {
    await httpClient.delete(`/salaries/${id}`)
  },
}
