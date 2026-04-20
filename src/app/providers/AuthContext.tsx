// src/app/providers/AuthContext.tsx

import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react'
import { authService } from '@/services/authService'
import { appConfig } from '@/app/config'
import type { SessionUser } from '@/backend/types'

interface AuthContextValue {
  user: SessionUser | null
  isAuthenticated: boolean
  /** Always resolves to true on success, throws on error */
  login: (email: string, password: string) => Promise<boolean>
  register: (name: string, email: string, password: string) => Promise<void>
  verifyCode: (email: string, code: string) => Promise<void>
  resetPassword: (email: string) => Promise<void>
  logout: () => void
  updateProfile: (name: string) => Promise<void>
  loginWithGoogle: () => Promise<{ isNewUser: boolean }>
  sendMagicLink: (email: string) => Promise<void>
  confirmMagicLink: (email: string) => Promise<{ isNewUser: boolean }>
}

const AuthContext = createContext<AuthContextValue | null>(null)

const AUTH_TOKEN_KEY = 'auth_token'
const AUTH_USER_KEY = 'auth_user'

const getStoredUser = (): SessionUser | null => {
  if (typeof window === 'undefined') return null
  const raw = window.localStorage.getItem(AUTH_USER_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as SessionUser
  } catch {
    return null
  }
}

const storeSession = (token: string, user: SessionUser): void => {
  window.localStorage.setItem(AUTH_TOKEN_KEY, token)
  window.localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user))
}

const clearSession = (): void => {
  window.localStorage.removeItem(AUTH_TOKEN_KEY)
  window.localStorage.removeItem(AUTH_USER_KEY)
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<SessionUser | null>(() => getStoredUser())

  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    const result = await authService.login(email, password)
    if (result.authenticated) {
      storeSession(result.token, result.user)
      setUser(result.user)
      return true
    }
    return false
  }, [])

  const register = useCallback(async (name: string, email: string, password: string): Promise<void> => {
    await authService.register(name, email, password)
  }, [])

  const verifyCode = useCallback(async (email: string, code: string): Promise<void> => {
    const response = await authService.verifyCode(email, code)
    storeSession(response.token, response.user)
    setUser(response.user)
  }, [])

  const resetPassword = useCallback(async (email: string): Promise<void> => {
    await authService.resetPassword(email)
  }, [])

  const logout = useCallback((): void => {
    clearSession()
    setUser(null)
  }, [])

  const loginWithGoogle = useCallback(async (): Promise<{ isNewUser: boolean }> => {
    const result = await authService.loginWithGoogle()
    storeSession(result.token, result.user)
    setUser(result.user)
    return { isNewUser: result.isNewUser }
  }, [])

  const sendMagicLink = useCallback(async (email: string): Promise<void> => {
    await authService.sendMagicLink(email)
  }, [])

  const confirmMagicLink = useCallback(async (email: string): Promise<{ isNewUser: boolean }> => {
    const result = await authService.confirmMagicLink(email)
    storeSession(result.token, result.user)
    setUser(result.user)
    return { isNewUser: result.isNewUser }
  }, [])

  const updateProfile = useCallback(async (name: string): Promise<void> => {
    if (appConfig.backend === 'firestore') {
      const [{ updateProfile: fbUpdateProfile }, { firebaseAuth }] = await Promise.all([
        import('firebase/auth'),
        import('@/backend/firestore/config'),
      ])
      const currentUser = firebaseAuth.currentUser
      if (currentUser) {
        await fbUpdateProfile(currentUser, { displayName: name })
      }
    }
    setUser((prev) => {
      if (!prev) return prev
      const updated: SessionUser = { ...prev, name }
      const token = window.localStorage.getItem(AUTH_TOKEN_KEY) ?? ''
      storeSession(token, updated)
      return updated
    })
  }, [])

  // For Firestore: listen to Firebase auth state changes.
  // If Firebase loses the session (refresh token expired / user disabled),
  // clear the stale localStorage entry so the user is redirected to login.
  useEffect(() => {
    if (appConfig.backend !== 'firestore') return
    let unsubscribe: (() => void) | undefined
    void Promise.all([
      import('firebase/auth'),
      import('@/backend/firestore/config'),
    ]).then(([{ onAuthStateChanged }, { firebaseAuth }]) => {
      unsubscribe = onAuthStateChanged(firebaseAuth, (fbUser) => {
        if (!fbUser) {
          clearSession()
          setUser(null)
        }
      })
    })
    return () => { unsubscribe?.() }
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({ user, isAuthenticated: Boolean(user), login, register, verifyCode, resetPassword, logout, updateProfile, loginWithGoogle, sendMagicLink, confirmMagicLink }),
    [user, login, register, verifyCode, resetPassword, logout, updateProfile, loginWithGoogle, sendMagicLink, confirmMagicLink],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
