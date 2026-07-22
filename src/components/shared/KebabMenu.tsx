// src/components/shared/KebabMenu.tsx
//
// Reusable three-dots (kebab) action menu. The dropdown is rendered via a portal
// to document.body so it is never clipped by an ancestor with `overflow: hidden`,
// and it flips upward when there isn't enough room below the trigger.

import React from 'react'
import ReactDOM from 'react-dom'
import styles from './KebabMenu.module.css'

export interface KebabMenuItem {
  label: string
  icon?: string
  onClick: () => void
  danger?: boolean
  disabled?: boolean
}

interface KebabMenuProps {
  items: KebabMenuItem[]
  ariaLabel?: string
  loading?: boolean
  disabled?: boolean
}

const MENU_WIDTH = 176
const ITEM_HEIGHT = 38

export function KebabMenu({
  items,
  ariaLabel = 'Más opciones',
  loading = false,
  disabled = false,
}: KebabMenuProps): React.ReactElement {
  const [open, setOpen] = React.useState(false)
  const [pos, setPos] = React.useState<{ top: number; left: number } | null>(null)
  const btnRef = React.useRef<HTMLButtonElement>(null)

  // A fixed-position menu would drift on scroll/resize — just close it.
  React.useEffect(() => {
    if (!open) return
    function close(): void {
      setOpen(false)
    }
    window.addEventListener('scroll', close, true)
    window.addEventListener('resize', close)
    return () => {
      window.removeEventListener('scroll', close, true)
      window.removeEventListener('resize', close)
    }
  }, [open])

  function toggle(e: React.MouseEvent): void {
    e.stopPropagation()
    if (open) {
      setOpen(false)
      return
    }
    const rect = btnRef.current?.getBoundingClientRect()
    if (rect) {
      const estHeight = items.length * ITEM_HEIGHT + 12
      const spaceBelow = window.innerHeight - rect.bottom
      const top = spaceBelow < estHeight + 12 ? Math.max(8, rect.top - estHeight - 4) : rect.bottom + 4
      const left = Math.max(8, rect.right - MENU_WIDTH)
      setPos({ top, left })
    }
    setOpen(true)
  }

  function runItem(e: React.MouseEvent, item: KebabMenuItem): void {
    e.stopPropagation()
    if (item.disabled) return
    setOpen(false)
    item.onClick()
  }

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        className={styles.trigger}
        onClick={toggle}
        disabled={disabled || loading}
        aria-label={ariaLabel}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {loading ? '⏳' : '⋮'}
      </button>

      {open && pos && ReactDOM.createPortal(
        <>
          <div className={styles.backdrop} onClick={(e) => { e.stopPropagation(); setOpen(false) }} />
          <div className={styles.menu} style={{ top: pos.top, left: pos.left }} role="menu">
            {items.map((item, i) => (
              <button
                key={i}
                type="button"
                role="menuitem"
                className={[styles.item, item.danger ? styles.itemDanger : ''].join(' ')}
                onClick={(e) => runItem(e, item)}
                disabled={item.disabled}
              >
                {item.icon && <span aria-hidden>{item.icon}</span>}
                {item.label}
              </button>
            ))}
          </div>
        </>,
        document.body,
      )}
    </>
  )
}
