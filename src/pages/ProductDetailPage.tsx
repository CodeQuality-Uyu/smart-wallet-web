// src/pages/ProductDetailPage.tsx

import React, { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useProduct, useUpdateProduct, useDeleteProduct } from '@/features/products/hooks/useProducts'
import { usePriceHistory, usePriceByPlace } from '@/features/products/hooks/usePriceHistory'
import { useProductCategories } from '@/features/products/hooks/useProductCategories'
import { useBrands } from '@/features/products/hooks/useBrands'
import { usePlaces } from '@/features/places/hooks/usePlaces'
import { ProductForm } from '@/features/products/components/ProductForm'
import { PriceByPlaceTable } from '@/features/products/components/PriceByPlaceTable'
import { PriceHistoryChart } from '@/features/products/components/PriceHistoryChart'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { ErrorMessage } from '@/components/ui/ErrorMessage'
import { Button } from '@/components/ui/Button'
import type { ProductFormValues } from '@/features/products/schemas/productSchema'
import styles from './ProductDetailPage.module.css'

export default function ProductDetailPage(): React.ReactElement {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [editing, setEditing] = useState(false)

  const { data: product, isLoading, error } = useProduct(id ?? '')
  const { data: priceHistory = [] } = usePriceHistory(id ?? '')
  const { data: priceByPlace = [] } = usePriceByPlace(id ?? '')
  const { data: categories = [] } = useProductCategories()
  const { data: brands = [] } = useBrands()
  const { data: places = [] } = usePlaces()

  const { mutateAsync: updateProduct } = useUpdateProduct(id ?? '')
  const { mutateAsync: deleteProduct } = useDeleteProduct()

  if (isLoading) return <LoadingSpinner fullPage />
  if (error || !product) return <ErrorMessage message="No se pudo cargar el producto." />

  const category = categories.find((c) => c.id === product.productCategoryId)
  const brand = product.brandId ? brands.find((b) => b.id === product.brandId) : undefined
  const placeNames = Object.fromEntries(places.map((p) => [p.id, p.name]))

  async function handleUpdate(values: ProductFormValues): Promise<void> {
    await updateProduct({
      name: values.name,
      pricingType: values.pricingType,
      weightUnit: values.weightUnit ?? undefined,
      productCategoryId: values.productCategoryId,
      brandId: values.brandId ?? undefined,
    })
    setEditing(false)
  }

  async function handleDelete(): Promise<void> {
    if (!window.confirm('¿Eliminar este producto?')) return
    await deleteProduct(product.id)
    navigate('/settings/products')
  }

  return (
    <div className={styles.page}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerTop}>
          <button className={styles.back} onClick={() => navigate(-1)} aria-label="Volver">
            ←
          </button>
          {!editing && (
            <button className={styles.editBtn} onClick={() => setEditing(true)}>
              ✏️ Editar
            </button>
          )}
        </div>

        <div className={styles.iconWrap} aria-hidden>
          {category?.icon ?? '📦'}
        </div>
        <h1 className={styles.name}>{product.name}</h1>

        <div className={styles.badges}>
          {category && <span className={styles.badge}>{category.name}</span>}
          {brand && <span className={styles.badge}>{brand.name}</span>}
        </div>
      </header>

      <div className={styles.body}>
        {/* Edit form */}
        {editing && (
          <section className={styles.section}>
            <ProductForm
              initialValues={{
                name: product.name,
                pricingType: product.pricingType,
                weightUnit: product.weightUnit,
                productCategoryId: product.productCategoryId,
                brandId: product.brandId,
              }}
              onSubmit={handleUpdate}
              submitLabel="Guardar cambios"
              onCancel={() => setEditing(false)}
            />
          </section>
        )}

        {/* Price by place */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Precio por local</h2>
          <PriceByPlaceTable rows={priceByPlace} />
        </section>

        {/* Price history chart */}
        {priceHistory.length > 0 && (
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Historial de precios</h2>
            <PriceHistoryChart records={priceHistory} placeNames={placeNames} />
          </section>
        )}

        {/* Delete */}
        <div className={styles.deleteWrap}>
          <Button variant="danger" fullWidth onClick={() => void handleDelete()}>
            Eliminar producto
          </Button>
        </div>
      </div>
    </div>
  )
}
