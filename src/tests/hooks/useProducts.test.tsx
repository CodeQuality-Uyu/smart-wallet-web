// src/tests/hooks/useProducts.test.tsx

import { describe, it, expect } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useProducts, useProduct, useCreateProduct, useDeleteProduct, useUpdateProduct } from '@/features/products/hooks/useProducts'
import { useAddPriceRecord } from '@/features/products/hooks/usePriceHistory'
import { renderWithProviders, createTestQueryClient } from '../utils/renderWithProviders'
import { QueryClientProvider } from '@tanstack/react-query'
import { ProductPricingType, Currency } from '@/types/enums'

// ─── useProducts ──────────────────────────────────────────

function ProductList({ search, categoryId }: { search?: string; categoryId?: string }) {
  const { data = [], isLoading } = useProducts({ search, categoryId })
  if (isLoading) return <p>Cargando</p>
  return (
    <ul>
      {data.map((p) => (
        <li key={p.id} data-testid="product-item">{p.name}</li>
      ))}
    </ul>
  )
}

describe('useProducts', () => {
  it('carga la lista completa', async () => {
    renderWithProviders(<ProductList />)
    await waitFor(() => {
      expect(screen.getAllByTestId('product-item').length).toBeGreaterThan(0)
    })
  })

  it('filtra por búsqueda', async () => {
    renderWithProviders(<ProductList search="leche" />)
    await waitFor(() => {
      const items = screen.getAllByTestId('product-item')
      expect(items.every((el) => el.textContent!.toLowerCase().includes('leche'))).toBe(true)
    })
  })

  it('filtra por categoría', async () => {
    renderWithProviders(<ProductList categoryId="pcat-3" />)
    await waitFor(() => {
      expect(screen.getAllByTestId('product-item').length).toBeGreaterThan(0)
    })
  })

  it('muestra lista vacía cuando no hay coincidencias', async () => {
    renderWithProviders(<ProductList search="zzz-no-existe" />)
    await waitFor(() => {
      expect(screen.queryByTestId('product-item')).not.toBeInTheDocument()
    })
  })
})

// ─── useProduct (detail) ──────────────────────────────────

function ProductDetail({ id }: { id: string }) {
  const { data, isLoading } = useProduct(id)
  if (isLoading) return <p>Cargando</p>
  if (!data) return <p>No encontrado</p>
  return <p data-testid="product-name">{data.name}</p>
}

describe('useProduct', () => {
  it('carga el detalle del producto', async () => {
    renderWithProviders(<ProductDetail id="prod-4" />)
    await waitFor(() => {
      expect(screen.getByTestId('product-name')).toHaveTextContent('Leche Conaprole 1L')
    })
  })

  it('no dispara query con id vacío', () => {
    renderWithProviders(<ProductDetail id="" />)
    // No debería salir del estado "No encontrado" sin hacer fetch
    expect(screen.getByText('No encontrado')).toBeInTheDocument()
  })
})

// ─── useCreateProduct ─────────────────────────────────────

function CreateProductButton() {
  const { mutate, data, isPending } = useCreateProduct()
  return (
    <>
      <button
        onClick={() =>
          mutate({
            name: 'Test Producto Nuevo',
            pricingType: ProductPricingType.Fixed,
            productCategoryId: 'pcat-3',
          })
        }
      >
        Crear
      </button>
      {isPending && <p>Creando...</p>}
      {data && <p data-testid="created-name">{data.name}</p>}
    </>
  )
}

describe('useCreateProduct', () => {
  it('crea un producto y expone el resultado', async () => {
    const user = userEvent.setup()
    renderWithProviders(<CreateProductButton />)

    await user.click(screen.getByText('Crear'))

    await waitFor(() => {
      expect(screen.getByTestId('created-name')).toHaveTextContent('Test Producto Nuevo')
    })
  })
})

// ─── useUpdateProduct ─────────────────────────────────────

function UpdateProductButton({ id }: { id: string }) {
  const { mutate, data, isPending } = useUpdateProduct(id)
  return (
    <>
      <button onClick={() => mutate({ name: 'Papa Colorada' })}>Actualizar</button>
      {isPending && <p>Actualizando...</p>}
      {data && <p data-testid="updated-name">{data.name}</p>}
    </>
  )
}

describe('useUpdateProduct', () => {
  it('actualiza el nombre del producto', async () => {
    const user = userEvent.setup()
    renderWithProviders(<UpdateProductButton id="prod-1" />)

    await user.click(screen.getByText('Actualizar'))

    await waitFor(() => {
      expect(screen.getByTestId('updated-name')).toHaveTextContent('Papa Colorada')
    })
  })
})

// ─── useDeleteProduct ─────────────────────────────────────

function DeleteProductButton({ id }: { id: string }) {
  const { mutate, isSuccess, isPending } = useDeleteProduct()
  return (
    <>
      <button onClick={() => mutate(id)}>Eliminar</button>
      {isPending && <p>Eliminando...</p>}
      {isSuccess && <p data-testid="deleted">Eliminado</p>}
    </>
  )
}

describe('useDeleteProduct', () => {
  it('elimina sin error y reporta éxito', async () => {
    const user = userEvent.setup()
    renderWithProviders(<DeleteProductButton id="prod-6" />)

    await user.click(screen.getByText('Eliminar'))

    await waitFor(() => {
      expect(screen.getByTestId('deleted')).toBeInTheDocument()
    })
  })
})

// ─── useAddPriceRecord ────────────────────────────────────

function AddPriceRecordButton() {
  const { mutate, data, isPending } = useAddPriceRecord()
  return (
    <>
      <button
        onClick={() =>
          mutate({
            productId: 'prod-5',
            placeId: 'place-2',
            unitPrice: 110,
            currency: Currency.UYU,
            recordedAt: '2026-03-25',
          })
        }
      >
        Agregar precio
      </button>
      {isPending && <p>Guardando...</p>}
      {data && <p data-testid="price-added">precio: {data.unitPrice}</p>}
    </>
  )
}

describe('useAddPriceRecord', () => {
  it('agrega un registro de precio y expone el resultado', async () => {
    const user = userEvent.setup()
    const qc = createTestQueryClient()
    renderWithProviders(
      <QueryClientProvider client={qc}>
        <AddPriceRecordButton />
      </QueryClientProvider>,
    )

    await user.click(screen.getByText('Agregar precio'))

    await waitFor(() => {
      expect(screen.getByTestId('price-added')).toHaveTextContent('precio: 110')
    })
  })
})
