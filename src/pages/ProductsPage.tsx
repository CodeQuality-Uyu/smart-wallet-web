// src/pages/ProductsPage.tsx

import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProducts, useCreateProduct } from '@/features/products/hooks/useProducts'
import { useProductCategories } from '@/features/products/hooks/useProductCategories'
import { useBrands } from '@/features/products/hooks/useBrands'
import { ProductListItem } from '@/features/products/components/ProductListItem'
import { ProductForm } from '@/features/products/components/ProductForm'
import { PageHeader } from '@/components/shared/PageHeader'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import type { ProductFormValues } from '@/features/products/schemas/productSchema'
import type { ProductsFilter } from '@/backend/types'
import styles from './ProductsPage.module.css'

export default function ProductsPage(): React.ReactElement {
  const navigate = useNavigate()
  const [showForm, setShowForm] = useState(false)
  const [search, setSearch] = useState('')
  const [selectedCategoryId, setSelectedCategoryId] = useState('')

  const filter: ProductsFilter = {
    search: search || undefined,
    categoryId: selectedCategoryId || undefined,
  }

  const { data: products = [], isLoading } = useProducts(filter)
  const { data: categories = [] } = useProductCategories()
  const { data: brands = [] } = useBrands()
  const { mutateAsync: createProduct } = useCreateProduct()

  const brandMap = Object.fromEntries(brands.map((b) => [b.id, b]))
  const categoryMap = Object.fromEntries(categories.map((c) => [c.id, c]))

  async function handleSubmit(values: ProductFormValues): Promise<void> {
    await createProduct({
      name: values.name,
      pricingType: values.pricingType,
      weightUnit: values.weightUnit ?? undefined,
      productCategoryId: values.productCategoryId,
      brandId: values.brandId ?? undefined,
    })
    setShowForm(false)
  }

  const filterBar = (
    <div className={styles.filterBar}>
      <input
        className={styles.searchInput}
        type="search"
        placeholder="Buscar..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        aria-label="Buscar productos"
      />
    </div>
  )

  return (
    <div>
      <PageHeader title="Productos" showBack rightAction={filterBar} />

      <div className={styles.body}>
        {/* Category filter chips */}
        {categories.length > 0 && (
          <div className={styles.catChips}>
            <button
              className={[styles.catChip, !selectedCategoryId ? styles.catChipActive : ''].join(' ')}
              onClick={() => setSelectedCategoryId('')}
            >
              Todos
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                className={[styles.catChip, selectedCategoryId === cat.id ? styles.catChipActive : ''].join(' ')}
                onClick={() => setSelectedCategoryId(selectedCategoryId === cat.id ? '' : cat.id)}
              >
                {cat.icon} {cat.name}
              </button>
            ))}
          </div>
        )}

        <button className={styles.addBtn} onClick={() => setShowForm((s) => !s)}>
          ＋ Agregar producto
        </button>

        {showForm && (
          <div className={styles.form}>
            <h2 className={styles.formTitle}>Nuevo producto</h2>
            <ProductForm
              onSubmit={handleSubmit}
              submitLabel="Crear producto"
              onCancel={() => setShowForm(false)}
            />
          </div>
        )}

        {isLoading ? (
          <LoadingSpinner />
        ) : products.length === 0 ? (
          <p className={styles.empty}>
            {search || selectedCategoryId ? 'Sin resultados.' : 'No hay productos aún.'}
          </p>
        ) : (
          <div className={styles.list}>
            {products.map((product) => (
              <ProductListItem
                key={product.id}
                product={product}
                category={categoryMap[product.productCategoryId]}
                brand={product.brandId ? brandMap[product.brandId] : undefined}
                onClick={(id) => void navigate(`/settings/products/${id}`)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
