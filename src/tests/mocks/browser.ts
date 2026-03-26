// src/tests/mocks/browser.ts
// Used in development (browser)
import { setupWorker } from 'msw/browser'
import { handlers } from './handlers'

export const worker = setupWorker(...handlers)
