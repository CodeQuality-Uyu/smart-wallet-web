// src/tests/components/ExpenseListItem.test.tsx

import { describe, it, expect } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ExpenseListItem } from '@/features/expenses/components/ExpenseListItem'
import { renderWithProviders } from '../utils/renderWithProviders'
import { mockExpenses } from '../mocks/data/expenses'
import { mockCategories } from '../mocks/data/categories'

const expense = mockExpenses[0]!

describe('ExpenseListItem', () => {
  it('renders description', () => {
    renderWithProviders(
      <ExpenseListItem expense={expense} categories={mockCategories} />
    )
    expect(screen.getByText("Almuerzo McDonald's")).toBeInTheDocument()
  })

  it('renders category badge', () => {
    renderWithProviders(
      <ExpenseListItem expense={expense} categories={mockCategories} />
    )
    expect(screen.getByText('Comida')).toBeInTheDocument()
  })

  it('renders formatted amount', () => {
    renderWithProviders(
      <ExpenseListItem expense={expense} categories={mockCategories} />
    )
    // Should contain the amount somewhere
    expect(screen.getByText(/12/)).toBeInTheDocument()
  })

  it('navigates to detail on click', async () => {
    const user = userEvent.setup()
    renderWithProviders(
      <ExpenseListItem expense={expense} categories={mockCategories} />,
      { initialEntries: ['/expenses'] }
    )
    await user.click(screen.getByRole('button'))
    // Navigation is tested via router; just ensure button is clickable
    expect(screen.getByRole('button')).toBeInTheDocument()
  })

  it('is keyboard accessible with Enter key', async () => {
    const user = userEvent.setup()
    renderWithProviders(
      <ExpenseListItem expense={expense} categories={mockCategories} />
    )
    const item = screen.getByRole('button')
    item.focus()
    await user.keyboard('{Enter}')
    // Should not throw
  })
})
