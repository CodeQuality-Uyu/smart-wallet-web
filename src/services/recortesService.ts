// src/services/recortesService.ts

import { getRecortesBackend } from '@/backend'
import type {
  Recorte,
  RecorteResult,
  CreateRecortePayload,
  UpdateRecortePayload,
} from '@/types/models'

export const recortesService = {
  async list(): Promise<Recorte[]> {
    return (await getRecortesBackend()).list()
  },

  async getById(id: string): Promise<Recorte> {
    return (await getRecortesBackend()).getById(id)
  },

  async create(payload: CreateRecortePayload): Promise<Recorte> {
    return (await getRecortesBackend()).create(payload)
  },

  async update(id: string, payload: UpdateRecortePayload): Promise<Recorte> {
    return (await getRecortesBackend()).update(id, payload)
  },

  async remove(id: string): Promise<void> {
    return (await getRecortesBackend()).remove(id)
  },

  async listResults(id: string): Promise<RecorteResult[]> {
    return (await getRecortesBackend()).listResults(id)
  },

  async addResult(id: string, result: Omit<RecorteResult, 'id'>): Promise<RecorteResult> {
    return (await getRecortesBackend()).addResult(id, result)
  },
}
