// src/tests/components/CategoryChips.test.tsx

import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CategoryChips } from '@/features/expenses/components/CategoryChips'
import { renderWithProviders } from '../utils/renderWithProviders'
import { mockCategories } from '../mocks/data/categories'

describe('CategoryChips', () => {
  it('renders all category chips', () => {
    renderWithProviders(
      <CategoryChips categories={mockCategories} selected={[]} onChange={vi.fn()} />
    )
    mockCategories.forEach((cat) => {
      expect(screen.getByText(cat.name)).toBeInTheDocument()
    })
  })

  it('marks selected categories visually', () => {
    renderWithProviders(
      <CategoryChips
        categories={mockCategories}
        selected={['cat-1']}
        onChange={vi.fn()}
      />
    )
    const comidaBtn = screen.getByRole('checkbox', { name: /Comida/ })
    expect(comidaBtn).toHaveAttribute('aria-checked', 'true')
  })

  it('calls onChange with toggled id when clicking unselected chip', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    renderWithProviders(
      <CategoryChips categories={mockCategories} selected={[]} onChange={onChange} />
    )
    await user.click(screen.getByRole('checkbox', { name: /Comida/ }))
    expect(onChange).toHaveBeenCalledWith(['cat-1'])
  })

  it('removes id from selection when clicking selected chip', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    renderWithProviders(
      <CategoryChips
        categories={mockCategories}
        selected={['cat-1', 'cat-2']}
        onChange={onChange}
      />
    )
    await user.click(screen.getByRole('checkbox', { name: /Comida/ }))
    expect(onChange).toHaveBeenCalledWith(['cat-2'])
  })

  it('supports multi-select', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    renderWithProviders(
      <CategoryChips categories={mockCategories} selected={[]} onChange={onChange} />
    )
    await user.click(screen.getByRole('checkbox', { name: /Comida/ }))
    expect(onChange).toHaveBeenCalledWith(['cat-1'])
  })
})
