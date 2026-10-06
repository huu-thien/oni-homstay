import { createContext, useContext } from 'react'

export type ToastType = 'success' | 'error' | 'info'
export interface ToastContextType {
  showToast: (message: string, type?: ToastType, duration?: number) => void
  success: (message: string) => void
  error: (message: string) => void
  info: (message: string) => void
}
export const ToastContext = createContext<ToastContextType | undefined>(undefined)
export function useToast() {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast must be used within a ToastProvider')
  return context
}
