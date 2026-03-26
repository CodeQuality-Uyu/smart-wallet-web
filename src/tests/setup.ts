// src/tests/setup.ts

import '@testing-library/jest-dom'
import { server } from './mocks/server'
import { beforeAll, afterEach, afterAll } from 'vitest'

// Start MSW server before all tests
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))

// Reset handlers after each test to avoid state leakage
afterEach(() => server.resetHandlers())

// Clean up after all tests
afterAll(() => server.close())
