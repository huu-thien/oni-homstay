import type { AuthResponse } from './publicApi'

export type AdminSession = AuthResponse

const ADMIN_SESSION_KEY = 'oni-admin-session'

export function getAdminSession() {
  if (typeof window === 'undefined') {
    return null
  }

  const raw = window.sessionStorage.getItem(ADMIN_SESSION_KEY)

  if (!raw) {
    return null
  }

  try {
    return JSON.parse(raw) as AdminSession
  } catch {
    window.sessionStorage.removeItem(ADMIN_SESSION_KEY)
    return null
  }
}

export function hasAdminSession() {
  return Boolean(getAdminSession())
}

export function setAdminSession(session: AdminSession) {
  if (typeof window === 'undefined') {
    return
  }

  window.sessionStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(session))
}

export function clearAdminSession() {
  if (typeof window === 'undefined') {
    return
  }

  window.sessionStorage.removeItem(ADMIN_SESSION_KEY)
}
