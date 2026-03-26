// src/backend/index.ts
// Factory: returns the correct backend implementation based on VITE_BACKEND

import type { IAuthBackend, ICardsBackend, ISalariesBackend } from './types'

type BackendType = 'msw' | 'firestore' | 'aws'

const backend = (import.meta.env.VITE_BACKEND ?? 'msw') as BackendType

// Lazy singletons — imported on first call to avoid bundling unused backends
let _authBackend: IAuthBackend | null = null
let _cardsBackend: ICardsBackend | null = null
let _salariesBackend: ISalariesBackend | null = null

export async function getAuthBackend(): Promise<IAuthBackend> {
  if (_authBackend) return _authBackend
  if (backend === 'firestore') {
    const { firestoreAuthBackend } = await import('./firestore/auth')
    _authBackend = firestoreAuthBackend
  } else {
    // msw | aws fallback to MSW http adapter
    const { mswAuthBackend } = await import('./msw/auth')
    _authBackend = mswAuthBackend
  }
  return _authBackend
}

export async function getCardsBackend(): Promise<ICardsBackend> {
  if (_cardsBackend) return _cardsBackend
  if (backend === 'firestore') {
    const { firestoreCardsBackend } = await import('./firestore/cards')
    _cardsBackend = firestoreCardsBackend
  } else {
    const { mswCardsBackend } = await import('./msw/cards')
    _cardsBackend = mswCardsBackend
  }
  return _cardsBackend
}

export async function getSalariesBackend(): Promise<ISalariesBackend> {
  if (_salariesBackend) return _salariesBackend
  if (backend === 'firestore') {
    const { firestoreSalariesBackend } = await import('./firestore/salaries')
    _salariesBackend = firestoreSalariesBackend
  } else {
    const { mswSalariesBackend } = await import('./msw/salaries')
    _salariesBackend = mswSalariesBackend
  }
  return _salariesBackend
}

export { backend as activeBackend }
