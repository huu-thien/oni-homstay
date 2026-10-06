import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { Alert, Snackbar } from '@mui/material'
import { ToastContext, type ToastType } from './useToast'
export interface ToastMessage { id: number; type: ToastType; message: string; duration: number }
let sequence = 0
export function ToastProvider({ children }: { children: ReactNode }) {
  const [queue, setQueue] = useState<ToastMessage[]>([])
  const showToast = useCallback((message: string, type: ToastType = 'info', duration = 5000) => {
    setQueue((current) => [...current, { id: ++sequence, message, type, duration }])
  }, [])
  const success = useCallback((message: string) => showToast(message, 'success'), [showToast])
  const error = useCallback((message: string) => showToast(message, 'error'), [showToast])
  const info = useCallback((message: string) => showToast(message, 'info'), [showToast])
  const value = useMemo(() => ({ showToast, success, error, info }), [showToast, success, error, info])
  const active = queue[0]
  const close = () => setQueue((current) => current.slice(1))
  return <ToastContext.Provider value={value}>{children}
    {active && <Snackbar key={active.id} open autoHideDuration={active.duration > 0 ? active.duration : null}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      onClose={(_, reason) => { if (reason !== 'clickaway') close() }}>
      <Alert severity={active.type} variant="filled" onClose={close} sx={{ width: '100%' }}>{active.message}</Alert>
    </Snackbar>}
  </ToastContext.Provider>
}
