// src/backend/firestore/auth.ts
// Auth backend using Firebase Authentication (email + password)
//
// Flow:
//   register(name, email, password) → createUserWithEmailAndPassword
//                                   → creates Firestore profile
//                                   → sendEmailVerification (link → /login?verified=true)
//                                   → signOut (session starts only after verify + login)
//   login(email, password)          → signInWithEmailAndPassword
//                                   → rejects if email not verified yet
//                                   → loads Firestore profile → returns session
//   resetPassword(email)            → sendPasswordResetEmail (works for passwordless users too)
//
// Firebase console setup needed:
//   1. Enable "Email/Contraseña" in Authentication > Sign-in methods
//   2. Add http://localhost:5173 to Authorized domains (for local dev)

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  signOut,
} from 'firebase/auth'
import { doc, setDoc, getDoc } from 'firebase/firestore'
import { firebaseAuth, firestore } from './config'
import { setTokenProvider } from '@/api/tokenProvider'
import type { IAuthBackend, AuthResponse, LoginResult } from '../types'

// Register Firestore token provider — Firebase auto-refreshes the ID token
// when it's close to expiry (every ~55 minutes), so callers always get a valid token.
setTokenProvider(async () => {
  if (!firebaseAuth.currentUser) return null
  return firebaseAuth.currentUser.getIdToken()
})

export const firestoreAuthBackend: IAuthBackend = {
  async login(email: string, password: string): Promise<LoginResult> {
    const result = await signInWithEmailAndPassword(firebaseAuth, email, password)
    const fbUser = result.user

    if (!fbUser.emailVerified) {
      await signOut(firebaseAuth)
      throw {
        message: 'Verificá tu email antes de ingresar. Revisá tu bandeja de entrada.',
        statusCode: 403,
      }
    }

    const token = await fbUser.getIdToken()

    let displayName = fbUser.displayName ?? email.split('@')[0] ?? email
    const profileSnap = await getDoc(doc(firestore, 'users', fbUser.uid))
    if (profileSnap.exists()) {
      displayName = (profileSnap.data().name as string) ?? displayName
    }

    return { authenticated: true, token, user: { id: fbUser.uid, email, name: displayName } }
  },

  async register(name: string, email: string, password: string): Promise<void> {
    const result = await createUserWithEmailAndPassword(firebaseAuth, email, password)
    const fbUser = result.user

    await setDoc(
      doc(firestore, 'users', fbUser.uid),
      { name, email, createdAt: new Date().toISOString() },
      { merge: true },
    )

    await sendEmailVerification(fbUser, {
      url: `${window.location.origin}/login?verified=true`,
    })

    // Sign out — session only starts after email is verified then user logs in
    await signOut(firebaseAuth)
  },

  async verifyCode(_email: string, _code: string): Promise<AuthResponse> {
    // Not used in Firestore mode (email+password flow has no code step)
    throw { message: 'No implementado en este modo.', statusCode: 501 }
  },

  async resetPassword(email: string): Promise<void> {
    await sendPasswordResetEmail(firebaseAuth, email, {
      url: `${window.location.origin}/reset-password`,
      handleCodeInApp: true,
    })
  },
}
