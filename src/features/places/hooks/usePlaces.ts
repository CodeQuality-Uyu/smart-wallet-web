// src/features/places/hooks/usePlaces.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { placesService } from '@/services/placesService'
import type { CreatePlacePayload, UpdatePlacePayload } from '@/types/models'
import { LocaleFilterPeriod } from '@/types/enums'

export const PLACE_KEYS = {
  all: ['places'] as const,
  list: (period?: LocaleFilterPeriod) => ['places', 'list', period] as const,
} as const

export function usePlaces(period?: LocaleFilterPeriod) {
  return useQuery({
    queryKey: PLACE_KEYS.list(period),
    queryFn: () => placesService.list(),
  })
}

export function useCreatePlace() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreatePlacePayload) => placesService.create(payload),
    onSuccess: () => void qc.invalidateQueries({ queryKey: PLACE_KEYS.all }),
  })
}

export function useUpdatePlace(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: UpdatePlacePayload) => placesService.update(id, payload),
    onSuccess: () => void qc.invalidateQueries({ queryKey: PLACE_KEYS.all }),
  })
}

export function useDeletePlace() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => placesService.remove(id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: PLACE_KEYS.all }),
  })
}
