// src/features/products/components/ProductPlaceInput.tsx
// Autocomplete for place selection within the product form.
// Searches the user's existing places + the global community pool.
// If a global place is chosen but not yet in the user's list, creates a personal copy first.
// Sets the Formik field to the user's place ID.

import React, { useState, useEffect, useRef } from 'react'
import { useField } from 'formik'
import { usePlaces, useSearchGlobalPlaces, useCreatePlace } from '@/features/places/hooks/usePlaces'
import type { GlobalPlace, Place } from '@/types/models'
import styles from './ProductPlaceInput.module.css'

const DEFAULT_ICON = '🏪'

type Suggestion =
  | { kind: 'user'; place: Place }
  | { kind: 'global'; place: GlobalPlace }

interface ProductPlaceInputProps {
  name?: string
  disabled?: boolean
}

export function ProductPlaceInput({ name = 'priceRecordPlaceId', disabled = false }: ProductPlaceInputProps): React.ReactElement {
  const [field, , helpers] = useField<string | undefined>(name)
  const [inputValue, setInputValue] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const wrapRef = useRef<HTMLDivElement>(null)

  const { data: userPlaces = [] } = usePlaces()
  const { data: globalPlaces = [] } = useSearchGlobalPlaces(searchQuery)
  const createPlace = useCreatePlace()

  // Show selected place name
  const selectedPlace = userPlaces.find((p) => p.id === field.value)
  useEffect(() => {
    if (selectedPlace && !inputValue) {
      setInputValue(selectedPlace.name)
    }
  }, [selectedPlace, inputValue])

  // 250 ms debounce
  useEffect(() => {
    const t = setTimeout(() => setSearchQuery(inputValue), 250)
    return () => clearTimeout(t)
  }, [inputValue])

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

  // Build suggestion list: matching user places first, then global not already in user's list
  const userGlobalIds = new Set(userPlaces.map((p) => p.globalPlaceId).filter(Boolean))
  const query = inputValue.toLowerCase()

  const userSuggs: Suggestion[] = userPlaces
    .filter((p) => p.active && p.name.toLowerCase().includes(query))
    .map((p) => ({ kind: 'user', place: p }))

  const globalSuggs: Suggestion[] = globalPlaces
    .filter((g) => !userGlobalIds.has(g.id))
    .map((g) => ({ kind: 'global', place: g }))

  const suggestions: Suggestion[] = [...userSuggs, ...globalSuggs]
  const showCreate = inputValue.trim().length >= 2
  const totalItems = suggestions.length + (showCreate ? 1 : 0)
  const showDropdown = open && (suggestions.length > 0 || showCreate)

  const fieldIcon = selectedPlace?.icon ?? (open ? DEFAULT_ICON : DEFAULT_ICON)

  async function selectSuggestion(s: Suggestion) {
    if (s.kind === 'user') {
      setInputValue(s.place.name)
      void helpers.setValue(s.place.id)
    } else {
      try {
        const created = await createPlace.mutateAsync({ name: s.place.name, globalPlaceId: s.place.id })
        setInputValue(created.name)
        void helpers.setValue(created.id)
      } catch { /* ignore */ }
    }
    setOpen(false)
    setActiveIndex(-1)
  }

  async function triggerCreate() {
    const trimmed = inputValue.trim()
    if (!trimmed) return
    try {
      const created = await createPlace.mutateAsync({ name: trimmed })
      setInputValue(created.name)
      void helpers.setValue(created.id)
      setOpen(false)
      setActiveIndex(-1)
    } catch { /* ignore */ }
  }

  function handleInput(e: React.ChangeEvent<HTMLInputElement>) {
    setInputValue(e.target.value)
    void helpers.setValue(undefined)
    setOpen(true)
    setActiveIndex(-1)
  }

  function handleClear() {
    setInputValue('')
    void helpers.setValue(undefined)
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
      if (activeIndex >= 0 && activeIndex < suggestions.length) {
        void selectSuggestion(suggestions[activeIndex]!)
      } else if (activeIndex === suggestions.length && showCreate) {
        void triggerCreate()
      }
    } else if (e.key === 'Escape') {
      setOpen(false)
      setActiveIndex(-1)
    }
  }

  return (
    <div ref={wrapRef} className={styles.wrap}>
      <div className={styles.field}>
        <span className={styles.iconPreview} aria-hidden>{fieldIcon}</span>
        <input
          type="text"
          className={styles.input}
          placeholder="Buscar o crear local..."
          value={inputValue}
          onChange={handleInput}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          autoComplete="off"
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={showDropdown}
          aria-autocomplete="list"
        />
        {inputValue && !disabled && (
          <button type="button" className={styles.clearBtn} onClick={handleClear} aria-label="Limpiar local">
            ×
          </button>
        )}
      </div>

      {showDropdown && (
        <ul className={styles.dropdown} role="listbox">
          {suggestions.map((s, idx) => {
            const icon = s.place.icon ?? DEFAULT_ICON
            const address = 'address' in s.place ? s.place.address : undefined
            return (
              <li
                key={s.kind === 'user' ? s.place.id : `g-${s.place.id}`}
                role="option"
                aria-selected={activeIndex === idx}
                className={[styles.option, activeIndex === idx ? styles.optionActive : ''].join(' ')}
                onMouseDown={() => void selectSuggestion(s)}
                onMouseEnter={() => setActiveIndex(idx)}
              >
                <span className={styles.optionIcon}>{icon}</span>
                <span className={styles.optionText}>
                  <span className={styles.optionName}>{s.place.name}</span>
                  {address && <span className={styles.optionAddr}>{address}</span>}
                </span>
                {s.kind === 'global' && <span className={styles.optionBadge}>global</span>}
              </li>
            )
          })}

          {showCreate && (
            <li
              role="option"
              aria-selected={activeIndex === suggestions.length}
              className={[
                styles.option,
                styles.optionCreate,
                suggestions.length > 0 ? styles.optionCreateSeparated : '',
                activeIndex === suggestions.length ? styles.optionActive : '',
              ].join(' ')}
              onMouseDown={() => void triggerCreate()}
              onMouseEnter={() => setActiveIndex(suggestions.length)}
            >
              {createPlace.isPending ? 'Creando...' : `Crear "${inputValue.trim()}"`}
            </li>
          )}
        </ul>
      )}
    </div>
  )
}
