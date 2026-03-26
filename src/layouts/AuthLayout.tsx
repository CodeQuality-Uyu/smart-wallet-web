// src/layouts/AuthLayout.tsx

import React from 'react'
import { Outlet } from 'react-router-dom'

export function AuthLayout(): React.ReactElement {
  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <Outlet />
    </div>
  )
}
