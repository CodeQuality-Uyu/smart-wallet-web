// src/features/expenses/components/InstallmentScopeChoice.tsx
//
// Selector "solo esta cuota / toda la serie" para editar o eliminar una compra en cuotas.

import React from 'react'
import styles from './InstallmentScopeChoice.module.css'

export type InstallmentScope = 'one' | 'all'

interface InstallmentScopeChoiceProps {
  scope: InstallmentScope
  onChange: (scope: InstallmentScope) => void
  count: number
  /** Número de la cuota actual (1-based), si se conoce. */
  number?: number
  action: 'edit' | 'delete'
}

export function InstallmentScopeChoice({
  scope,
  onChange,
  count,
  number,
  action,
}: InstallmentScopeChoiceProps): React.ReactElement {
  const verb = action === 'edit' ? 'editar' : 'eliminar'
  const oneLabel = number ? `Solo esta cuota (${number}/${count})` : 'Solo esta cuota'

  return (
    <fieldset className={styles.wrap}>
      <legend className={styles.legend}>
        Esta compra tiene {count} cuotas. ¿Qué querés {verb}?
      </legend>
      <label className={styles.option}>
        <input
          type="radio"
          name="installment-scope"
          checked={scope === 'one'}
          onChange={() => onChange('one')}
        />
        <span>{oneLabel}</span>
      </label>
      <label className={styles.option}>
        <input
          type="radio"
          name="installment-scope"
          checked={scope === 'all'}
          onChange={() => onChange('all')}
        />
        <span>Toda la serie ({count} cuotas)</span>
      </label>
    </fieldset>
  )
}
