// src/hooks/useIsDesktop.ts
import { useState, useEffect } from 'react'

const BREAKPOINT = 768

export function useIsDesktop(): boolean {
  const [isDesktop, setIsDesktop] = useState(() => window.innerWidth >= BREAKPOINT)

  useEffect(() => {
    const mq = window.matchMedia(`(min-width: ${BREAKPOINT}px)`)
    const handler = (e: MediaQueryListEvent): void => setIsDesktop(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  return isDesktop
}
