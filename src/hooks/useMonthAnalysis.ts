// src/hooks/useMonthAnalysis.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { monthAnalysisService } from '@/services/monthAnalysisService'
import type { MetricsSummary } from '@/types/models'

const key = (yearMonth: string) => ['monthAnalysis', yearMonth] as const

export function useMonthAnalysis(yearMonth: string) {
  return useQuery({
    queryKey: key(yearMonth),
    queryFn: () => monthAnalysisService.get(yearMonth),
    enabled: Boolean(yearMonth),
    staleTime: Infinity,
  })
}

export function useGenerateMonthAnalysis(yearMonth: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (metrics: MetricsSummary) => monthAnalysisService.generate(yearMonth, metrics),
    onSuccess: (analysis) => qc.setQueryData(key(yearMonth), analysis),
  })
}
