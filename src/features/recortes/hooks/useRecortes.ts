// src/features/recortes/hooks/useRecortes.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { recortesService } from '@/services/recortesService'
import { draftRecorte, computeRecorte, getRecorteData } from '@/services/recorteAnalysisService'
import type { CreateRecortePayload, UpdateRecortePayload, Recorte } from '@/types/models'

export const RECORTE_KEYS = {
  all: ['recortes'] as const,
  list: () => ['recortes', 'list'] as const,
  detail: (id: string) => ['recortes', 'detail', id] as const,
  results: (id: string) => ['recortes', 'results', id] as const,
  data: (id: string) => ['recortes', 'data', id] as const,
} as const

export function useRecortesList() {
  return useQuery({
    queryKey: RECORTE_KEYS.list(),
    queryFn: () => recortesService.list(),
  })
}

export function useRecorteResults(id: string) {
  return useQuery({
    queryKey: RECORTE_KEYS.results(id),
    queryFn: () => recortesService.listResults(id),
    enabled: Boolean(id),
  })
}

/**
 * Datos analizados de un recorte para el panel de auditoría: reconstruye la muestra
 * de gastos y los agregados actuales. `enabled` para cargarlo solo al abrir el panel.
 */
export function useRecorteData(recorte: Recorte, enabled: boolean) {
  return useQuery({
    queryKey: RECORTE_KEYS.data(recorte.id),
    queryFn: () => getRecorteData(recorte),
    enabled,
    staleTime: 60 * 1000,
  })
}

/** Paso "Procesar": genera el borrador editable del recorte a partir del prompt. */
export function useDraftRecorte() {
  return useMutation({
    mutationFn: (prompt: string) => draftRecorte(prompt),
  })
}

/**
 * Crea el recorte y, acto seguido, calcula y persiste su primer resultado.
 * Si el cálculo falla, el recorte queda creado igual (se puede recalcular luego).
 */
export function useCreateRecorte() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: CreateRecortePayload): Promise<Recorte> => {
      const recorte = await recortesService.create(payload)
      try {
        const result = await computeRecorte(recorte)
        await recortesService.addResult(recorte.id, result)
      } catch {
        // El primer cálculo puede fallar (sin API key, error de red): no bloquea la creación.
      }
      return recorte
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: RECORTE_KEYS.all }),
  })
}

export function useUpdateRecorte(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: UpdateRecortePayload) => recortesService.update(id, payload),
    onSuccess: () => void qc.invalidateQueries({ queryKey: RECORTE_KEYS.all }),
  })
}

export function useDeleteRecorte() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => recortesService.remove(id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: RECORTE_KEYS.all }),
  })
}

/** Botón "Recalcular" del feed: recomputa y guarda un nuevo resultado. */
export function useRecomputeRecorte() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (recorte: Recorte) => {
      const result = await computeRecorte(recorte)
      return recortesService.addResult(recorte.id, result)
    },
    onSuccess: (_data, recorte) => {
      void qc.invalidateQueries({ queryKey: RECORTE_KEYS.list() })
      void qc.invalidateQueries({ queryKey: RECORTE_KEYS.results(recorte.id) })
    },
  })
}
