// src/backend/msw/recortes.ts
// Recortes backend implemented via the MSW-intercepted HTTP adapter

import { httpClient } from '@/api/httpClient'
import type {
  IRecortesBackend,
  Recorte,
  RecorteResult,
  CreateRecortePayload,
  UpdateRecortePayload,
} from '../types'

export const mswRecortesBackend: IRecortesBackend = {
  async list(): Promise<Recorte[]> {
    const { data } = await httpClient.get<Recorte[]>('/recortes')
    return data
  },

  async getById(id: string): Promise<Recorte> {
    const { data } = await httpClient.get<Recorte>(`/recortes/${id}`)
    return data
  },

  async create(payload: CreateRecortePayload): Promise<Recorte> {
    const { data } = await httpClient.post<Recorte>('/recortes', payload)
    return data
  },

  async update(id: string, payload: UpdateRecortePayload): Promise<Recorte> {
    const { data } = await httpClient.patch<Recorte>(`/recortes/${id}`, payload)
    return data
  },

  async remove(id: string): Promise<void> {
    await httpClient.delete(`/recortes/${id}`)
  },

  async listResults(id: string): Promise<RecorteResult[]> {
    const { data } = await httpClient.get<RecorteResult[]>(`/recortes/${id}/results`)
    return data
  },

  async addResult(id: string, result: Omit<RecorteResult, 'id'>): Promise<RecorteResult> {
    const { data } = await httpClient.post<RecorteResult>(`/recortes/${id}/results`, result)
    return data
  },
}
