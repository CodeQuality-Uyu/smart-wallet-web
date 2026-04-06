// src/features/products/components/ProductLineAutocomplete.tsx
// Controlled autocomplete for picking a personal product in ticket lines.
// Shows brand name in suggestions. Uses a portal so it works inside any scroll container.

import React, { useRef, useState, useEffect, useCallback } from 'react'
import ReactDOM from 'react-dom'
import { useProducts } from '../hooks/useProducts'
import { useBrands } from '../hooks/useBrands'
import type { Product } from '@/types/models'
import styles from './ProductLineAutocomplete.module.css'

interface ProductLineAutocompleteProps {
  value: string
  onChange: (name: string, product: Product | null) => void
  disabled?: boolean
  placeholder?: string
}

export function ProductLineAutocomplete({
  value,
  onChange,
  disabled,
  placeholder = 'Buscar producto...',
}: ProductLineAutocompleteProps): React.ReactElement {
  const [open, setOpen] = useState(false)
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({})
  const wrapRef = useRef<HTMLDivElement>(null)

  const { data: products = [] } = useProducts()
  const { data: brands = [] } = useBrands()

  const query = value.toLowerCase()
  const suggestions =
    query.length >= 1
      ? products.filter((p) => p.active && p.name.toLowerCase().includes(query)).slice(0, 6)
      : []

  const updatePosition = useCallback(() => {
    if (!wrapRef.current) return
    const rect = wrapRef.current.getBoundingClientRect()
    setDropdownStyle({
      position: 'fixed',
      top: rect.bottom + 4,
      left: rect.left,
      width: rect.width,
      zIndex: 1000,
    })
  }, [])

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [])

  function handleFocus() {
    updatePosition()
    setOpen(true)
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    onChange(e.target.value, null)
    updatePosition()
    setOpen(true)
  }

  function selectProduct(p: Product) {
    onChange(p.name, p)
    setOpen(false)
  }

  return (
    <div ref={wrapRef} className={styles.wrap}>
      <input
        className={styles.input}
        placeholder={placeholder}
        value={value}
        onChange={handleChange}
        onFocus={handleFocus}
        disabled={disabled}
        autoComplete="off"
        aria-haspopup="listbox"
        aria-expanded={open && suggestions.length > 0}
        aria-autocomplete="list"
      />
      {open &&
        suggestions.length > 0 &&
        ReactDOM.createPortal(
          <ul className={styles.dropdown} style={dropdownStyle} role="listbox">
            {suggestions.map((p) => {
              const brand = p.brandId ? brands.find((b) => b.id === p.brandId) : undefined
              return (
                <li
                  key={p.id}
                  role="option"
                  className={styles.option}
                  onMouseDown={() => selectProduct(p)}
                >
                  <span className={styles.name}>{p.name}</span>
                  {brand && <span className={styles.meta}>{brand.name}</span>}
                </li>
              )
            })}
          </ul>,
          document.body
        )}
    </div>
  )
}
