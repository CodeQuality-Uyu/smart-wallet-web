// src/features/products/components/ProductNameInput.tsx
// Formik-aware autocomplete for product name with global product suggestions.

import React, { useState, useEffect, useRef } from 'react'
import { useField } from 'formik'
import { useSearchGlobalProducts } from '../hooks/useProducts'
import type { GlobalProductSuggestion } from '@/types/models'
import styles from './BrandAutocomplete.module.css'
import nameStyles from './ProductNameInput.module.css'

interface ProductNameInputProps {
  onSelectGlobal: (suggestion: GlobalProductSuggestion | null) => void
}

export function ProductNameInput({ onSelectGlobal }: ProductNameInputProps): React.ReactElement {
  const [field, _meta, helpers] = useField<string>('name')
  const [searchQuery, setSearchQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const [selectedGlobal, setSelectedGlobal] = useState<GlobalProductSuggestion | null>(null)
  const wrapRef = useRef<HTMLDivElement>(null)

  // 250 ms debounce
  useEffect(() => {
    const t = setTimeout(() => setSearchQuery(field.value), 250)
    return () => clearTimeout(t)
  }, [field.value])

  const { data: suggestions = [], isFetching } = useSearchGlobalProducts(searchQuery)

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

  const showDropdown = open && field.value.length >= 2

  function selectSuggestion(s: GlobalProductSuggestion) {
    void helpers.setValue(s.name)
    setSelectedGlobal(s)
    onSelectGlobal(s)
    setOpen(false)
    setActiveIndex(-1)
  }

  function handleInput(e: React.ChangeEvent<HTMLInputElement>) {
    void helpers.setValue(e.target.value)
    setOpen(true)
    setActiveIndex(-1)
    // If the user edits freely after having selected a global product, clear the selection
    if (selectedGlobal) {
      setSelectedGlobal(null)
      onSelectGlobal(null)
    }
  }

  function handleClear() {
    void helpers.setValue('')
    setSelectedGlobal(null)
    onSelectGlobal(null)
    setOpen(false)
    setActiveIndex(-1)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!showDropdown) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => Math.min(i + 1, suggestions.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (activeIndex >= 0 && activeIndex < suggestions.length) {
        selectSuggestion(suggestions[activeIndex]!)
      } else {
        setOpen(false)
      }
    } else if (e.key === 'Escape') {
      setOpen(false)
      setActiveIndex(-1)
    }
  }

  return (
    <div ref={wrapRef} className={styles.wrap}>
      <div className={styles.field}>
        <input
          type="text"
          className={styles.input}
          placeholder="Nombre del producto..."
          value={field.value}
          onChange={handleInput}
          onFocus={() => field.value.length >= 2 && setOpen(true)}
          onKeyDown={handleKeyDown}
          autoComplete="off"
          aria-haspopup="listbox"
          aria-expanded={showDropdown}
          aria-autocomplete="list"
        />
        {field.value && (
          <button
            type="button"
            className={styles.clearBtn}
            onClick={handleClear}
            aria-label="Limpiar nombre"
          >
            ×
          </button>
        )}
      </div>

      {showDropdown && (
        <ul className={styles.dropdown} role="listbox">
          {isFetching && suggestions.length === 0 && (
            <li className={styles.hint}>Buscando...</li>
          )}

          {suggestions.map((s, idx) => (
            <li
              key={s.id}
              role="option"
              aria-selected={activeIndex === idx}
              className={[styles.option, activeIndex === idx ? styles.optionActive : ''].join(' ')}
              onMouseDown={() => selectSuggestion(s)}
              onMouseEnter={() => setActiveIndex(idx)}
            >
              <span className={nameStyles.suggName}>{s.name}</span>
              {(s.brandName ?? s.lastPlaceName) && (
                <span className={nameStyles.suggMeta}>
                  {[s.brandName, s.lastPlaceName].filter(Boolean).join(' · ')}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
