// src/main.tsx

import React from 'react'
import ReactDOM from 'react-dom/client'
import { AppProviders } from '@/app/providers/AppProviders'
import { AppRouter } from '@/app/router'
import { appConfig } from '@/app/config'
import './index.css'

async function bootstrap(): Promise<void> {
  if (appConfig.backend === 'msw' && appConfig.appEnv === 'development') {
    const { worker } = await import('@/tests/mocks/browser')
    await worker.start({
      onUnhandledRequest: 'bypass',
      serviceWorker: { url: '/mockServiceWorker.js' },
    })
  }

  const root = document.getElementById('root')
  if (!root) throw new Error('Root element not found')

  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <AppProviders>
        <AppRouter />
      </AppProviders>
    </React.StrictMode>
  )
}

void bootstrap()
