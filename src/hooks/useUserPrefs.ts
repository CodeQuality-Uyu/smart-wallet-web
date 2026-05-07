// src/hooks/useUserPrefs.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { userPrefsService } from '@/services/userPrefsService'

const KEY = ['userPrefs'] as const

export function useUserPrefs() {
  return useQuery({
    queryKey: KEY,
    queryFn: () => userPrefsService.get(),
    staleTime: Infinity,
  })
}

export function useSetDefaultCard() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (cardId: string) => userPrefsService.set({ defaultCardId: cardId }),
    onSuccess: (updated) => qc.setQueryData(KEY, updated),
  })
}
