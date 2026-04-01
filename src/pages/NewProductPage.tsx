// src/pages/NewProductPage.tsx

import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useCreateProduct } from '@/features/products/hooks/useProducts'
import { useAddPriceRecord } from '@/features/products/hooks/usePriceHistory'
import { ProductForm } from '@/features/products/components/ProductForm'
import { useIsDesktop } from '@/hooks/useIsDesktop'
import type { ProductFormValues } from '@/features/products/schemas/productSchema'
import { Currency } from '@/types/enums'
import styles from './NewProductPage.module.css'

export default function NewProductPage(): React.ReactElement {
  const navigate = useNavigate()
  const isDesktop = useIsDesktop()
  const { mutateAsync: createProduct } = useCreateProduct()
  const { mutateAsync: addPriceRecord } = useAddPriceRecord()

  async function handleSubmit(values: ProductFormValues): Promise<void> {
    const created = await createProduct({
      name: values.name,
      pricingType: values.pricingType,
      weightUnit: values.weightUnit ?? undefined,
      productCategoryId: values.productCategoryId,
      brandId: values.brandId ?? undefined,
      globalProductId: values.globalProductId ?? undefined,
    })

    if (values.unitPrice && values.unitPrice > 0 && values.priceRecordPlaceId) {
      await addPriceRecord({
        productId: created.globalProductId,
        placeId: values.priceRecordPlaceId,
        unitPrice: values.unitPrice,
        currency: values.currency ?? Currency.UYU,
        recordedAt: new Date().toISOString().split('T')[0] as string,
      })
    }

    navigate(`/settings/products/${created.id}`, { replace: true })
  }

  if (isDesktop) {
    return (
      <div className={styles.desktopPage}>
        <div className={styles.desktopCard}>
          <div className={styles.desktopHeader}>
            <h1 className={styles.desktopTitle}>Nuevo producto</h1>
          </div>
          <div className={styles.desktopBody}>
            <ProductForm
              onSubmit={handleSubmit}
              submitLabel="Crear producto"
              showPriceSection
              onCancel={() => navigate(-1)}
            />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <button
          className={styles.closeBtn}
          onClick={() => navigate(-1)}
          aria-label="Volver"
        >
          ←
        </button>
        <h1 className={styles.title}>Nuevo producto</h1>
        <div style={{ width: 36 }} />
      </header>
      <div className={styles.body}>
        <ProductForm
          onSubmit={handleSubmit}
          submitLabel="Crear producto"
          showPriceSection
          onCancel={() => navigate(-1)}
        />
      </div>
    </div>
  )
}
