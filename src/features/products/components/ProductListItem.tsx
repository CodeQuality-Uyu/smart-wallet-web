// src/features/products/components/ProductListItem.tsx

import React from 'react'
import type { Product, ProductCategory, Brand } from '@/types/models'
import { ProductPricingType } from '@/types/enums'
import styles from './ProductListItem.module.css'

interface ProductListItemProps {
  product: Product
  category?: ProductCategory
  brand?: Brand
  onClick?: (id: string) => void
}

const WEIGHT_UNIT_LABEL: Record<string, string> = {
  kg: 'kg',
  g: 'g',
  l: 'l',
  ml: 'ml',
}

export function ProductListItem({
  product,
  category,
  brand,
  onClick,
}: ProductListItemProps): React.ReactElement {
  function handleClick() {
    onClick?.(product.id)
  }

  const pricingLabel =
    product.pricingType === ProductPricingType.ByWeight && product.weightUnit
      ? `Por ${WEIGHT_UNIT_LABEL[product.weightUnit] ?? product.weightUnit}`
      : 'Por unidad'

  return (
    <article
      className={[styles.row, onClick ? styles.clickable : ''].join(' ')}
      onClick={handleClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && handleClick() : undefined}
      aria-label={product.name}
    >
      <div className={styles.icon} aria-hidden>
        {category?.icon ?? '📦'}
      </div>

      <div className={styles.info}>
        <p className={styles.name}>{product.name}</p>
        <div className={styles.meta}>
          {category && (
            <span className={styles.badge}>{category.name}</span>
          )}
          {brand && (
            <span className={styles.badge}>{brand.name}</span>
          )}
          <span className={styles.pricingBadge}>{pricingLabel}</span>
        </div>
      </div>

      {onClick && (
        <span className={styles.chevron} aria-hidden>›</span>
      )}
    </article>
  )
}
