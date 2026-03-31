// src/features/places/components/PlaceNameInput.tsx
// Autocomplete name field for places — searches the global community pool.
// Uses Formik context; sets name, address, icon, globalPlaceId on selection.

import React, { useState, useEffect, useRef } from 'react'
import { useFormikContext } from 'formik'
import { useSearchGlobalPlaces } from '../hooks/usePlaces'
import type { PlaceFormValues } from '../schemas/placeSchema'
import styles from './PlaceNameInput.module.css'

const DEFAULT_ICON = '🏪'

export function PlaceNameInput(): React.ReactElement {
  const { values, setFieldValue, errors, touched } = useFormikContext<PlaceFormValues>()
  const [inputValue, setInputValue] = useState(values.name)
  const [searchQuery, setSearchQuery] = useState('')
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setSearchQuery(inputValue), 250)
    return () => clearTimeout(t)
  }, [inputValue])

  const { data: suggestions = [] } = useSearchGlobalPlaces(searchQuery)

  // Close dropdown on outside click
  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [])

  function handleInput(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value
    setInputValue(val)
    void setFieldValue('name', val)
    void setFieldValue('globalPlaceId', undefined)
    setOpen(true)
  }

  function selectSuggestion(s: { id: string; name: string; address?: string; icon?: string }) {
    setInputValue(s.name)
    void setFieldValue('name', s.name)
    void setFieldValue('address', s.address ?? '')
    void setFieldValue('icon', s.icon ?? DEFAULT_ICON)
    void setFieldValue('globalPlaceId', s.id)
    setOpen(false)
  }

  const showDropdown = open && suggestions.length > 0
  const icon = values.icon ?? DEFAULT_ICON

  return (
    <div ref={wrapRef} className={styles.wrap}>
      <div className={styles.field}>
        <span className={styles.iconPreview}>{icon}</span>
        <input
          className={[styles.input, touched.name && errors.name ? styles.inputError : ''].join(' ')}
          type="text"
          placeholder="ej. Disco Pocitos"
          value={inputValue}
          onChange={handleInput}
          onFocus={() => inputValue.length >= 2 && setOpen(true)}
          autoComplete="off"
        />
      </div>
      {touched.name && errors.name && (
        <p className={styles.error}>{errors.name}</p>
      )}
      {showDropdown && (
        <ul className={styles.dropdown} role="listbox">
          {suggestions.map((s) => (
            <li
              key={s.id}
              role="option"
              aria-selected={values.globalPlaceId === s.id}
              className={[styles.option, values.globalPlaceId === s.id ? styles.optionSelected : ''].join(' ')}
              onMouseDown={() => selectSuggestion(s)}
            >
              <span className={styles.optionIcon}>{s.icon ?? DEFAULT_ICON}</span>
              <span className={styles.optionText}>
                <span className={styles.optionName}>{s.name}</span>
                {s.address && <span className={styles.optionAddr}>{s.address}</span>}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
