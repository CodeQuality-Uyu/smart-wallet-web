// src/tests/hooks/useExpenses.test.tsx

import { describe, it, expect } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { useExpenses } from '@/features/expenses/hooks/useExpenses'
import { renderWithProviders } from '../utils/renderWithProviders'

// Simple component to exercise the hook
function TestHarness(): React.ReactElement {
  const { data, isLoading, error } = useExpenses()
  if (isLoading) return <p>Loading</p>
  if (error) return <p>Error</p>
  return <p>Count: {data?.total ?? 0}</p>
}

import React from 'react'

describe('useExpenses', () => {
  it('fetches and exposes expense list', async () => {
    renderWithProviders(<TestHarness />)
    expect(screen.getByText('Loading')).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.getByText(/Count: \d/)).toBeInTheDocument()
    })
  })

  it('returns more than 0 results from mock', async () => {
    renderWithProviders(<TestHarness />)
    await waitFor(() => {
      const text = screen.getByText(/Count:/)
      const count = parseInt(text.textContent?.replace('Count: ', '') ?? '0')
      expect(count).toBeGreaterThan(0)
    })
  })
})
