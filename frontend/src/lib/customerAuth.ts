export type CustomerSession = {
  accessToken: string
  refreshToken: string
  user: {
    id: string
    fullName: string
    email: string
    phone: string
    role: string
    status: string
    createdAt: string
  }
}

const CUSTOMER_SESSION_KEY = 'oni-customer-session'

export function getCustomerSession() {
  if (typeof window === 'undefined') {
    return null
  }

  const raw = window.sessionStorage.getItem(CUSTOMER_SESSION_KEY)

  if (!raw) {
    return null
  }

  try {
    return JSON.parse(raw) as CustomerSession
  } catch {
    window.sessionStorage.removeItem(CUSTOMER_SESSION_KEY)
    return null
  }
}

export function setCustomerSession(session: CustomerSession) {
  if (typeof window === 'undefined') {
    return
  }

  window.sessionStorage.setItem(CUSTOMER_SESSION_KEY, JSON.stringify(session))
}

export function clearCustomerSession() {
  if (typeof window === 'undefined') {
    return
  }

  window.sessionStorage.removeItem(CUSTOMER_SESSION_KEY)
}

