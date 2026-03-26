// src/api/tokenProvider.ts
// Pluggable token getter used by httpClient.
//
// Default: reads the static token stored in localStorage (MSW / AWS).
// Firestore: overridden with `() => firebaseAuth.currentUser.getIdToken()`
// so Firebase handles automatic refresh transparently.

type TokenGetter = () => Promise<string | null>

let _getter: TokenGetter = async () =>
  window.localStorage.getItem('auth_token')

export function setTokenProvider(getter: TokenGetter): void {
  _getter = getter
}

export async function getToken(): Promise<string | null> {
  return _getter()
}
