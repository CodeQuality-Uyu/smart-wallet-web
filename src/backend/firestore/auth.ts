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
  GoogleAuthProvider,
  signInWithPopup,
  sendSignInLinkToEmail,
  signInWithEmailLink,
  isSignInWithEmailLink,
} from 'firebase/auth'
import { doc, setDoc, getDoc } from 'firebase/firestore'
import { firebaseAuth, firestore } from './config'
import { setTokenProvider } from '@/api/tokenProvider'
import type { IAuthBackend, AuthResponse, LoginResult, SocialAuthResult } from '../types'

const MAGIC_LINK_EMAIL_KEY = 'magic_link_email'

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

  async loginWithGoogle(): Promise<SocialAuthResult> {
    const provider = new GoogleAuthProvider()
    const result = await signInWithPopup(firebaseAuth, provider)
    const fbUser = result.user
    const token = await fbUser.getIdToken()

    const profileRef = doc(firestore, 'users', fbUser.uid)
    const profileSnap = await getDoc(profileRef)
    const isNewUser = !profileSnap.exists()

    if (isNewUser) {
      const name = fbUser.displayName ?? fbUser.email?.split('@')[0] ?? 'Usuario'
      await setDoc(profileRef, { name, email: fbUser.email, createdAt: new Date().toISOString() }, { merge: true })
    }

    const name = isNewUser
      ? (fbUser.displayName ?? fbUser.email?.split('@')[0] ?? 'Usuario')
      : ((profileSnap.data()?.name as string) ?? fbUser.displayName ?? 'Usuario')

    return { token, user: { id: fbUser.uid, email: fbUser.email ?? '', name }, isNewUser }
  },

  async sendMagicLink(email: string): Promise<void> {
    await sendSignInLinkToEmail(firebaseAuth, email, {
      url: `${window.location.origin}/login`,
      handleCodeInApp: true,
    })
    window.localStorage.setItem(MAGIC_LINK_EMAIL_KEY, email)
  },

  async confirmMagicLink(email: string): Promise<SocialAuthResult> {
    const href = window.location.href
    if (!isSignInWithEmailLink(firebaseAuth, href)) {
      throw { message: 'El link de acceso no es válido o ya expiró.', statusCode: 400 }
    }

    const result = await signInWithEmailLink(firebaseAuth, email, href)
    const fbUser = result.user
    const token = await fbUser.getIdToken()
    window.localStorage.removeItem(MAGIC_LINK_EMAIL_KEY)

    const profileRef = doc(firestore, 'users', fbUser.uid)
    const profileSnap = await getDoc(profileRef)
    const isNewUser = !profileSnap.exists()

    if (isNewUser) {
      const name = email.split('@')[0]
      await setDoc(profileRef, { name, email, createdAt: new Date().toISOString() }, { merge: true })
    }

    const name = isNewUser
      ? email.split('@')[0]
      : ((profileSnap.data()?.name as string) ?? email.split('@')[0])

    return { token, user: { id: fbUser.uid, email, name }, isNewUser }
  },
}
