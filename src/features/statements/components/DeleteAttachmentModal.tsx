// src/features/statements/components/DeleteAttachmentModal.tsx

import React, { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import type { ReportAttachment } from '@/types/models'

interface Props {
  attachment: ReportAttachment
  linkedExpenseCount: number
  isDeleting: boolean
  onClose: () => void
  onConfirm: (deleteExpenses: boolean) => void
}

export function DeleteAttachmentModal({
  attachment,
  linkedExpenseCount,
  isDeleting,
  onClose,
  onConfirm,
}: Props): React.ReactElement {
  const [deleteExpenses, setDeleteExpenses] = useState(false)
  const hasLinked = linkedExpenseCount > 0

  return (
    <Modal title="Eliminar documento" onClose={onClose} width={460}>
      <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <p style={{ fontSize: 14, color: 'var(--ink)', lineHeight: 1.5, margin: 0 }}>
          ¿Seguro que querés eliminar <strong>{attachment.name}</strong>? Se borrará el documento y
          su archivo. Esta acción no se puede deshacer.
        </p>

        {hasLinked && (
          <>
            <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.5, margin: 0 }}>
              Este documento generó <strong>{linkedExpenseCount} gasto{linkedExpenseCount !== 1 ? 's' : ''}</strong> confirmado{linkedExpenseCount !== 1 ? 's' : ''}. Por defecto los gastos se conservan.
            </p>
            <label
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 10,
                padding: '12px 14px',
                border: `1.5px solid ${deleteExpenses ? 'var(--rose, #e11d48)' : 'var(--border)'}`,
                borderRadius: 10,
                background: deleteExpenses ? 'var(--rose-lt, #fef2f2)' : 'transparent',
                cursor: 'pointer',
                transition: 'border-color .15s, background .15s',
              }}
            >
              <input
                type="checkbox"
                checked={deleteExpenses}
                onChange={(e) => setDeleteExpenses(e.target.checked)}
                style={{ marginTop: 2, flexShrink: 0 }}
              />
              <span style={{ fontSize: 13, color: 'var(--ink)', lineHeight: 1.4 }}>
                Eliminar también {linkedExpenseCount === 1 ? 'el gasto importado' : `los ${linkedExpenseCount} gastos importados`} de este documento
              </span>
            </label>
          </>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, marginTop: 4 }}>
          <Button variant="ghost" onClick={onClose} disabled={isDeleting}>
            Cancelar
          </Button>
          <Button variant="danger" loading={isDeleting} onClick={() => onConfirm(deleteExpenses)}>
            {deleteExpenses && hasLinked
              ? `Eliminar documento y ${linkedExpenseCount} gasto${linkedExpenseCount !== 1 ? 's' : ''}`
              : 'Eliminar documento'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
