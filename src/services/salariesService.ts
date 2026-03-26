// src/services/salariesService.ts
// Thin delegator — all logic lives in the active backend implementation.

import { getSalariesBackend } from '@/backend'
import type { Salary, CreateSalaryPayload } from '@/backend/types'

export type { Salary, CreateSalaryPayload }

export const salariesService = {
  async list(): Promise<Salary[]> {
    return (await getSalariesBackend()).list()
  },

  async create(payload: CreateSalaryPayload): Promise<Salary> {
    return (await getSalariesBackend()).create(payload)
  },

  async remove(id: string): Promise<void> {
    return (await getSalariesBackend()).remove(id)
  },
}
