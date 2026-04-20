// src/pages/ProductsPage.tsx

import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProducts } from '@/features/products/hooks/useProducts'
import { useProductCategories } from '@/features/products/hooks/useProductCategories'
import { useBrands } from '@/features/products/hooks/useBrands'
import { usePriceHistory } from '@/features/products/hooks/usePriceHistory'
import { ProductListItem } from '@/features/products/components/ProductListItem'
import { PageHeader } from '@/components/shared/PageHeader'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { PeriodControl } from '@/components/ui/PeriodControl'
import type { ProductsFilter } from '@/backend/types'
import type { Product, ProductCategory, Brand } from '@/types/models'
import { ProductPricingType } from '@/types/enums'
import styles from './ProductsPage.module.css'

// ─── Price row: fetches history to show último precio + variación ──

interface ProductTableRowProps {
  product: Product
  cat: ProductCategory | undefined
  brand: Brand | undefined
  onClick: () => void
}

function ProductTableRow({ product, cat, brand, onClick }: ProductTableRowProps): React.ReactElement {
  const { data: history = [] } = usePriceHistory(product.globalProductId)

  const sorted = [...history].sort((a, b) => b.recordedAt.localeCompare(a.recordedAt))
  const latest = sorted[0]
  const prev = sorted[1]

  const variationPct =
    latest && prev
      ? Math.round(((latest.unitPrice - prev.unitPrice) / prev.unitPrice) * 100)
      : null

  const currSymbol = latest?.currency === 'USD' ? 'U$S' : '$'

  return (
    <div
      className={styles.dtTableRow}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
    >
      {/* Producto */}
      <div className={styles.dtProductCell}>
        <span className={styles.dtProductIcon}>{cat?.icon ?? '📦'}</span>
        <div>
          <span className={styles.dtProductName}>{product.name}</span>
          {brand && <span className={styles.dtBrandBadge}>{brand.name}</span>}
        </div>
      </div>

      {/* Categoría */}
      <div>
        {cat ? (
          <span
            className={styles.dtCatBadge}
            style={{ background: `${cat.color}22`, color: cat.color, borderColor: `${cat.color}55` }}
          >
            {cat.icon} {cat.name}
          </span>
        ) : (
          <span className={styles.dtMuted}>–</span>
        )}
      </div>

      {/* Tipo */}
      <div>
        <span className={[styles.dtTypeBadge, product.pricingType === ProductPricingType.ByWeight ? styles.dtTypeBadgeWeight : ''].join(' ')}>
          {product.pricingType === ProductPricingType.ByWeight ? 'Peso' : 'Unidad'}
        </span>
      </div>

      {/* Últ. precio */}
      <div className={styles.dtMono}>
        {latest ? `${currSymbol} ${latest.unitPrice.toLocaleString('es-UY')}` : '–'}
      </div>

      {/* Variación */}
      <div>
        {variationPct !== null ? (
          <span className={[styles.dtVariation, variationPct > 0 ? styles.dtVariationUp : styles.dtVariationDown].join(' ')}>
            {variationPct > 0 ? `+${variationPct}%` : `${variationPct}%`}
          </span>
        ) : (
          <span className={styles.dtMuted}>–</span>
        )}
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────

const TYPE_OPTIONS = [
  { value: '', label: 'Todos' },
  { value: ProductPricingType.Fixed, label: 'Unidad' },
  { value: ProductPricingType.ByWeight, label: 'Peso' },
]

export default function ProductsPage(): React.ReactElement {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [selectedCategoryId, setSelectedCategoryId] = useState('')
  const [selectedType, setSelectedType] = useState<ProductPricingType | ''>('')

  const filter: ProductsFilter = {
    search: search || undefined,
    categoryId: selectedCategoryId || undefined,
  }

  const { data: products = [], isLoading } = useProducts(filter)
  const { data: categories = [] } = useProductCategories()
  const { data: brands = [] } = useBrands()

  const brandMap = Object.fromEntries(brands.map((b) => [b.id, b]))
  const categoryMap = Object.fromEntries(categories.map((c) => [c.id, c]))

  const visibleProducts = selectedType ? products.filter((p) => p.pricingType === selectedType) : products

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
    <div className={styles.root}>
      {/* ── Mobile view ───────────────────────────── */}
      <div className={styles.mobileView}>
        <PageHeader title="Productos" rightAction={filterBar} />
        <div className={styles.body}>
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
          <button className={styles.addBtn} onClick={() => void navigate('/settings/products/new')}>
            ＋ Agregar producto
          </button>
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

      {/* ── Desktop view ──────────────────────────── */}
      <div className={styles.desktopView}>
        {/* Header */}
        <div className={styles.dtHeader}>
          <div>
            <h1 className={styles.dtTitle}>Productos</h1>
            <p className={styles.dtSubtitle}>El desglose de los gastos: cada ítem del ticket es un producto</p>
          </div>
          <button className={styles.dtAddBtn} onClick={() => void navigate('/settings/products/new')}>
            ＋ Nuevo producto
          </button>
        </div>

        {/* Stat card — solo total productos */}
        <div className={styles.dtStats}>
          <div className={styles.dtStatCard}>
            <span className={styles.dtStatLabel}>Total productos</span>
            <span className={styles.dtStatValue}>{products.length}</span>
          </div>
        </div>

        {/* Filters row */}
        <div className={styles.dtFilters}>
          {/* Búsqueda */}
          <div className={styles.dtSearchWrap}>
            <span className={styles.dtSearchIcon}>🔍</span>
            <input
              className={styles.dtSearch}
              type="search"
              placeholder="Buscar productos..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Buscar productos"
            />
          </div>

          {/* Categorías — dropdown estilo FormField */}
          <div className={styles.dtCatSelectWrap}>
            <select
              className={styles.dtCatSelect}
              value={selectedCategoryId}
              onChange={(e) => setSelectedCategoryId(e.target.value)}
            >
              <option value="">Todas las categorías</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
              ))}
            </select>
          </div>

          {/* Tipo — PeriodControl */}
          <PeriodControl
            value={selectedType}
            onChange={(v) => setSelectedType(v as ProductPricingType | '')}
            options={TYPE_OPTIONS}
          />
        </div>

        {/* Table */}
        {isLoading ? (
          <LoadingSpinner />
        ) : visibleProducts.length === 0 ? (
          <p className={styles.dtEmpty}>
            {search || selectedCategoryId || selectedType ? 'Sin resultados para los filtros aplicados.' : 'No hay productos aún.'}
          </p>
        ) : (
          <div className={styles.dtTable}>
            <div className={styles.dtTableHead}>
              <span>Producto</span>
              <span>Categoría</span>
              <span>Tipo</span>
              <span>Últ. precio</span>
              <span>Variación</span>
            </div>
            {visibleProducts.map((product) => (
              <ProductTableRow
                key={product.id}
                product={product}
                cat={categoryMap[product.productCategoryId]}
                brand={product.brandId ? brandMap[product.brandId] : undefined}
                onClick={() => void navigate(`/settings/products/${product.id}`)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
