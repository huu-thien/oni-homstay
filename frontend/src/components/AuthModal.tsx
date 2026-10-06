import { useState, type FormEvent } from 'react'
import { Alert, Button, Dialog, DialogTitle, DialogContent, DialogActions, IconButton, Stack, Tabs, Tab, TextField } from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import isEmail from 'validator/lib/isEmail'
import { useToast } from './useToast'
import { ApiError } from '../lib/api'
import { forgotCustomerPassword, loginCustomer, registerCustomer, type AuthResponse } from '../lib/publicApi'

export type AuthMode = 'login' | 'register' | 'forgot'
type AuthModalProps = {
  mode: AuthMode | null; onClose: () => void; onChangeMode: (mode: AuthMode) => void
  onAdminLoginSuccess: (session: AuthResponse) => void; onCustomerAuthSuccess: (session: AuthResponse) => void
}
export function AuthModal({ mode, onClose, onChangeMode, onAdminLoginSuccess, onCustomerAuthSuccess }: AuthModalProps) {
  const toast = useToast()
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [sent, setSent] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const isRegister = mode === 'register'
  const isForgot = mode === 'forgot'
  const close = () => {
    if (isSubmitting) return
    setIdentifier(''); setPassword(''); setFullName(''); setPhone(''); setMessage(null); setErrors({}); setSent(false)
    onClose()
  }
  const changeMode = (next: AuthMode) => { setErrors({}); setMessage(null); setSent(false); onChangeMode(next) }
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (isSubmitting) return
    const next: Record<string, string> = {}
    if (!identifier.trim()) next.identifier = 'Vui lòng nhập tài khoản.'
    else if (mode !== 'login' && !isEmail(identifier.trim())) next.identifier = 'Email không hợp lệ.'
    if (!isForgot && !password) next.password = 'Vui lòng nhập mật khẩu.'
    if (isRegister) {
      if (!fullName.trim() || fullName.trim().length > 150) next.fullName = 'Họ tên cần từ 1 đến 150 ký tự.'
      if (password.length < 8) next.password = 'Mật khẩu cần ít nhất 8 ký tự.'
      if (!/^(0|\+84)[0-9]{9,10}$/.test(phone.trim())) next.phone = 'Số điện thoại không hợp lệ.'
    }
    setErrors(next); setMessage(null); setSent(false)
    if (Object.keys(next).length) return
    setIsSubmitting(true)
    try {
      if (isForgot) {
        const response = await forgotCustomerPassword({ email: identifier.trim() })
        setMessage(response.message); setSent(true); return
      }
      const response = isRegister
        ? await registerCustomer({ fullName: fullName.trim(), email: identifier.trim(), phone: phone.trim(), password })
        : await loginCustomer({ identifier: identifier.trim(), password })
      if (response.data.user.role === 'ADMIN') onAdminLoginSuccess(response.data)
      else onCustomerAuthSuccess(response.data)
      setPassword(''); setMessage(null)
      onClose()
    } catch (error) {
      const text = error instanceof ApiError ? error.message : 'Không thể kết nối. Vui lòng thử lại.'
      setMessage(text); toast.error(text)
    } finally { setIsSubmitting(false) }
  }
  return <Dialog open={Boolean(mode)} onClose={close} fullWidth maxWidth="sm" aria-labelledby="auth-title">
    <DialogTitle id="auth-title" sx={{ pr: 7 }}>
      {isForgot ? 'Khôi phục mật khẩu' : isRegister ? 'Tạo tài khoản mới' : 'Chào mừng quay lại'}
      <IconButton aria-label="Đóng" onClick={close} disabled={isSubmitting} sx={{ position: 'absolute', right: 8, top: 8 }}>
        <CloseIcon />
      </IconButton>
    </DialogTitle>
    <Stack component="form" noValidate onSubmit={submit}>
      <DialogContent><Stack spacing={3}>
        {!isForgot && <Tabs value={mode ?? 'login'} onChange={(_, next: AuthMode) => changeMode(next)} variant="fullWidth">
          <Tab label="Đăng nhập" value="login" disabled={isSubmitting} /><Tab label="Đăng ký" value="register" disabled={isSubmitting} />
        </Tabs>}
        {isRegister && <TextField label="Họ và tên" required autoComplete="name" value={fullName} disabled={isSubmitting}
          onChange={(event) => setFullName(event.target.value)} error={Boolean(errors.fullName)} helperText={errors.fullName} />}
        <TextField label={mode === 'login' ? 'Email, số điện thoại hoặc tài khoản' : 'Email'} required autoFocus
          type={mode === 'login' ? 'text' : 'email'} autoComplete={mode === 'login' ? 'username' : 'email'}
          value={identifier} disabled={isSubmitting} onChange={(event) => setIdentifier(event.target.value)}
          error={Boolean(errors.identifier)} helperText={errors.identifier} />
        {!isForgot && <TextField label="Mật khẩu" required type="password" value={password} disabled={isSubmitting}
          autoComplete={isRegister ? 'new-password' : 'current-password'} onChange={(event) => setPassword(event.target.value)}
          error={Boolean(errors.password)} helperText={errors.password} />}
        {isRegister && <TextField label="Số điện thoại" required type="tel" autoComplete="tel" value={phone} disabled={isSubmitting}
          onChange={(event) => setPhone(event.target.value)} error={Boolean(errors.phone)} helperText={errors.phone} />}
        {message && <Alert severity={sent ? 'success' : 'error'}>{message}</Alert>}
      </Stack></DialogContent>
      <DialogActions sx={{ px: 3, pb: 3, flexDirection: 'column', gap: 1 }}>
        <Button type="submit" variant="contained" fullWidth disabled={isSubmitting}>
          {isSubmitting ? 'Đang xử lý…' : isForgot ? 'Gửi email khôi phục' : isRegister ? 'Tạo tài khoản' : 'Đăng nhập'}
        </Button>
        <Button disabled={isSubmitting} onClick={() => changeMode(isForgot ? 'login' : 'forgot')}>
          {isForgot ? 'Quay lại đăng nhập' : 'Quên mật khẩu?'}
        </Button>
      </DialogActions>
    </Stack>
  </Dialog>
}
