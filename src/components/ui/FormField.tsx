// src/components/ui/FormField.tsx
// Wraps a field with label + Formik error display

import React from 'react'
import { useField } from 'formik'
import styles from './FormField.module.css'

interface FormFieldProps {
  name: string
  label: string
  hint?: string
  children: React.ReactNode
}

export function FormField({ name, label, hint, children }: FormFieldProps): React.ReactElement {
  const [, meta] = useField(name)
  const hasError = Boolean(meta.touched && meta.error)

  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={name}>
        {label}
      </label>
      {children}
      {hint && !hasError && <p className={styles.hint}>{hint}</p>}
      {hasError && (
        <p className={styles.error} role="alert" id={`${name}-error`}>
          {meta.error}
        </p>
      )}
    </div>
  )
}

// ─── TextInput ────────────────────────────────────────────

interface TextInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  name: string
  icon?: string
}

export function TextInput({ name, icon, ...props }: TextInputProps): React.ReactElement {
  const [field, meta] = useField(name)
  const hasError = Boolean(meta.touched && meta.error)

  return (
    <div className={styles.inputWrap}>
      {icon && <span className={styles.inputIcon} aria-hidden>{icon}</span>}
      <input
        id={name}
        className={[styles.input, hasError ? styles.inputError : '', icon ? styles.inputWithIcon : ''].join(' ')}
        aria-describedby={hasError ? `${name}-error` : undefined}
        aria-invalid={hasError}
        {...field}
        {...props}
      />
    </div>
  )
}

// ─── SelectInput ──────────────────────────────────────────

interface SelectOption {
  value: string
  label: string
}

interface SelectInputProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  name: string
  options: SelectOption[]
  placeholder?: string
  icon?: string
}

export function SelectInput({
  name,
  options,
  placeholder,
  icon,
  ...props
}: SelectInputProps): React.ReactElement {
  const [field, meta] = useField(name)
  const hasError = Boolean(meta.touched && meta.error)

  return (
    <div className={[styles.inputWrap, styles.selectWrap].join(' ')}>
      {icon && <span className={styles.inputIcon} aria-hidden>{icon}</span>}
      <select
        id={name}
        className={[styles.input, styles.select, hasError ? styles.inputError : '', icon ? styles.inputWithIcon : ''].join(' ')}
        aria-describedby={hasError ? `${name}-error` : undefined}
        aria-invalid={hasError}
        {...field}
        {...props}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  )
}
