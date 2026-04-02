// src/tests/components/BrandAutocomplete.test.tsx

import { describe, it, expect } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Formik, Form } from 'formik'
import { BrandAutocomplete } from '@/features/products/components/BrandAutocomplete'
import { renderWithProviders } from '../utils/renderWithProviders'

function Wrapper({ onValues }: { onValues?: (v: Record<string, unknown>) => void }) {
  return (
    <Formik
      initialValues={{ brandId: undefined as string | undefined }}
      onSubmit={(values) => { onValues?.(values) }}
    >
      <Form>
        <BrandAutocomplete name="brandId" />
        <button type="submit">Enviar</button>
      </Form>
    </Formik>
  )
}

describe('BrandAutocomplete', () => {
  it('no muestra dropdown con menos de 2 caracteres', async () => {
    const user = userEvent.setup()
    renderWithProviders(<Wrapper />)

    await user.type(screen.getByPlaceholderText(/buscar o crear/i), 'A')

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('muestra resultados al escribir 2+ caracteres', async () => {
    const user = userEvent.setup()
    renderWithProviders(<Wrapper />)

    await user.type(screen.getByPlaceholderText(/buscar o crear/i), 'Co')

    await waitFor(() => {
      expect(screen.getByRole('listbox')).toBeInTheDocument()
    })

    // mockBrands includes 'Conaprole' which matches 'Co'
    await waitFor(() => {
      expect(screen.getByText('Conaprole')).toBeInTheDocument()
    })
  })

  it('muestra opción "Crear marca" cuando hay texto suficiente', async () => {
    const user = userEvent.setup()
    renderWithProviders(<Wrapper />)

    await user.type(screen.getByPlaceholderText(/buscar o crear/i), 'Nu')

    await waitFor(() => {
      expect(screen.getByText(/Crear marca "Nu"/i)).toBeInTheDocument()
    })
  })

  it('selecciona una marca existente con click', async () => {
    const user = userEvent.setup()
    let captured: Record<string, unknown> = {}
    renderWithProviders(<Wrapper onValues={(v) => { captured = v }} />)

    await user.type(screen.getByPlaceholderText(/buscar o crear/i), 'Arc')

    await waitFor(() => {
      expect(screen.getByText('Arcor')).toBeInTheDocument()
    })

    await user.click(screen.getByText('Arcor'))

    // Input should show the brand name
    expect(screen.getByPlaceholderText(/buscar o crear/i)).toHaveValue('Arcor')

    // Submit and check formik value
    await user.click(screen.getByText('Enviar'))
    await waitFor(() => {
      expect(captured['brandId']).toBe('brand-2')
    })
  })

  it('navega con teclado y selecciona con Enter', async () => {
    const user = userEvent.setup()
    renderWithProviders(<Wrapper />)

    const input = screen.getByPlaceholderText(/buscar o crear/i)
    await user.type(input, 'Co')

    await waitFor(() => {
      expect(screen.getByText('Conaprole')).toBeInTheDocument()
    })

    await user.keyboard('{ArrowDown}{Enter}')

    expect(input).toHaveValue('Conaprole')
  })

  it('cierra el dropdown con Escape', async () => {
    const user = userEvent.setup()
    renderWithProviders(<Wrapper />)

    await user.type(screen.getByPlaceholderText(/buscar o crear/i), 'Co')

    await waitFor(() => {
      expect(screen.getByRole('listbox')).toBeInTheDocument()
    })

    await user.keyboard('{Escape}')

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('limpia el valor al hacer click en ×', async () => {
    const user = userEvent.setup()
    renderWithProviders(<Wrapper />)

    const input = screen.getByPlaceholderText(/buscar o crear/i)
    await user.type(input, 'Arc')

    await waitFor(() => {
      expect(screen.getByText('Arcor')).toBeInTheDocument()
    })

    await user.click(screen.getByText('Arcor'))
    expect(input).toHaveValue('Arcor')

    await user.click(screen.getByRole('button', { name: /limpiar/i }))
    expect(input).toHaveValue('')
  })
})
