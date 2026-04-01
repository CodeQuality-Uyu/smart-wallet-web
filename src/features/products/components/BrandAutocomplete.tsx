// src/features/products/components/BrandAutocomplete.tsx
// Formik-aware autocomplete for brand selection + inline creation.

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useFormikContext } from 'formik'
import { useSearchBrands, useCreateBrand } from '../hooks/useBrands'
import type { Brand } from '@/types/models'
import styles from './BrandAutocomplete.module.css'

interface BrandAutocompleteProps {
  /** Formik field name for the brandId value */
  name?: string
}

export function BrandAutocomplete({ name = 'brandId' }: BrandAutocompleteProps): React.ReactElement {
  const { setFieldValue, errors, touched } = useFormikContext<Record<string, string | undefined>>()

  const [inputValue, setInputValue] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const wrapRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLUListElement>(null)

  const createBrand = useCreateBrand()

  // 250ms debounce
  useEffect(() => {
    const t = setTimeout(() => setSearchQuery(inputValue), 250)
    return () => clearTimeout(t)
  }, [inputValue])

  const { data: results = [], isFetching } = useSearchBrands(searchQuery)

  // Close on outside click
  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false)
        setActiveIndex(-1)
      }
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [])

  const showDropdown = open && inputValue.length >= 2

  // Items: existing brands + "Crear marca X" pseudo-option
  const items = results
  const showCreate = inputValue.trim().length >= 2
  const totalItems = items.length + (showCreate ? 1 : 0)

  function selectBrand(brand: Brand) {
    setInputValue(brand.name)
    void setFieldValue(name, brand.id)
    setOpen(false)
    setActiveIndex(-1)
  }

  const triggerCreate = useCallback(async () => {
    const trimmed = inputValue.trim()
    if (!trimmed) return
    try {
      const created = await createBrand.mutateAsync({ name: trimmed })
      setInputValue(created.name)
      void setFieldValue(name, created.id)
      setOpen(false)
      setActiveIndex(-1)
    } catch {
      // mutation error shown externally if needed
    }
  }, [inputValue, createBrand, setFieldValue, name])

  function handleInput(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value
    setInputValue(val)
    void setFieldValue(name, undefined)
    setOpen(true)
    setActiveIndex(-1)
  }

  function handleClear() {
    setInputValue('')
    void setFieldValue(name, undefined)
    setOpen(false)
    setActiveIndex(-1)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!showDropdown) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => Math.min(i + 1, totalItems - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (activeIndex >= 0 && activeIndex < items.length) {
        selectBrand(items[activeIndex]!)
      } else if (activeIndex === items.length && showCreate) {
        void triggerCreate()
      }
    } else if (e.key === 'Escape') {
      setOpen(false)
      setActiveIndex(-1)
    }
  }

  const hasError = Boolean(touched[name] && errors[name])

  return (
    <div ref={wrapRef} className={styles.wrap}>
      <div className={[styles.field, hasError ? styles.fieldError : ''].join(' ')}>
        <input
          type="text"
          className={styles.input}
          placeholder="Buscar o crear marca..."
          value={inputValue}
          onChange={handleInput}
          onFocus={() => inputValue.length >= 2 && setOpen(true)}
          onKeyDown={handleKeyDown}
          autoComplete="off"
          aria-haspopup="listbox"
          aria-expanded={showDropdown}
          aria-autocomplete="list"
        />
        {inputValue && (
          <button
            type="button"
            className={styles.clearBtn}
            onClick={handleClear}
            aria-label="Limpiar marca"
          >
            ×
          </button>
        )}
      </div>

      {hasError && (
        <p className={styles.error}>{errors[name] as string}</p>
      )}

      {showDropdown && (
        <ul ref={listRef} className={styles.dropdown} role="listbox">
          {isFetching && items.length === 0 && (
            <li className={styles.hint}>Buscando...</li>
          )}

          {!isFetching && items.length === 0 && !showCreate && (
            <li className={styles.hint}>Sin resultados</li>
          )}

          {items.map((brand, idx) => (
            <li
              key={brand.id}
              role="option"
              aria-selected={activeIndex === idx}
              className={[styles.option, activeIndex === idx ? styles.optionActive : ''].join(' ')}
              onMouseDown={() => selectBrand(brand)}
              onMouseEnter={() => setActiveIndex(idx)}
            >
              {brand.name}
            </li>
          ))}

          {showCreate && (
            <li
              role="option"
              aria-selected={activeIndex === items.length}
              className={[
                styles.option,
                styles.optionCreate,
                items.length > 0 ? styles.optionCreateSeparated : '',
                activeIndex === items.length ? styles.optionActive : '',
              ].join(' ')}
              onMouseDown={() => void triggerCreate()}
              onMouseEnter={() => setActiveIndex(items.length)}
            >
              {createBrand.isPending ? 'Creando...' : `Crear marca "${inputValue.trim()}"`}
            </li>
          )}
        </ul>
      )}
    </div>
  )
}
