// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { ThemeProvider } from '@mui/material'
import { AuthModal } from './AuthModal'
import { ToastProvider } from './ToastContext'
import { theme } from '../theme'

const api = vi.hoisted(() => ({ loginCustomer: vi.fn(), registerCustomer: vi.fn(), forgotCustomerPassword: vi.fn() }))
vi.mock('../lib/publicApi', () => api)
const onCustomer = vi.fn()
const onAdmin = vi.fn()
function mount(mode: 'login' | 'register' | 'forgot') {
  render(<ThemeProvider theme={theme}><ToastProvider><AuthModal mode={mode} onClose={vi.fn()} onChangeMode={vi.fn()}
    onAdminLoginSuccess={onAdmin} onCustomerAuthSuccess={onCustomer} /></ToastProvider></ThemeProvider>)
}
beforeEach(() => {
  vi.clearAllMocks()
  api.loginCustomer.mockResolvedValue({ data: { user: { role: 'CUSTOMER' } } })
  api.registerCustomer.mockResolvedValue({ data: { user: { role: 'CUSTOMER' } } })
  api.forgotCustomerPassword.mockResolvedValue({ message: 'Email đã được gửi.' })
})
afterEach(cleanup)
describe('authentication dialog', () => {
  it('supports keyboard form submit and preserves password bytes', async () => {
    mount('login')
    fireEvent.change(screen.getByLabelText(/Email, số điện thoại hoặc tài khoản/), { target: { value: ' admin ' } })
    fireEvent.change(screen.getByLabelText(/Mật khẩu/), { target: { value: ' secret pass ' } })
    const button = screen.getByRole('button', { name: 'Đăng nhập' })
    if (!button.closest('form')) throw new Error('Missing login form')
    fireEvent.submit(button.closest('form')!)
    await waitFor(() => expect(api.loginCustomer).toHaveBeenCalledWith({ identifier: 'admin', password: ' secret pass ' }))
    expect(onCustomer).toHaveBeenCalledTimes(1)
  })
  it('routes administrator login to the existing admin session handler', async () => {
    api.loginCustomer.mockResolvedValue({ data: { user: { role: 'ADMIN' } } })
    mount('login')
    fireEvent.change(screen.getByLabelText(/Email, số điện thoại hoặc tài khoản/), { target: { value: 'admin' } })
    fireEvent.change(screen.getByLabelText(/Mật khẩu/), { target: { value: 'StrongPassword123' } })
    fireEvent.click(screen.getByRole('button', { name: 'Đăng nhập' }))
    await waitFor(() => expect(onAdmin).toHaveBeenCalledTimes(1))
    expect(onCustomer).not.toHaveBeenCalled()
  })
  it('blocks invalid registration without sending a request', async () => {
    mount('register')
    fireEvent.click(screen.getByRole('button', { name: 'Tạo tài khoản' }))
    expect(await screen.findByText('Họ tên cần từ 1 đến 150 ký tự.')).toBeTruthy()
    expect(screen.getByText('Mật khẩu cần ít nhất 8 ký tự.')).toBeTruthy()
    expect(api.registerCustomer).not.toHaveBeenCalled()
  })
  it('submits the unchanged registration contract', async () => {
    mount('register')
    fireEvent.change(screen.getByLabelText(/Họ và tên/), { target: { value: ' Anh ' } })
    fireEvent.change(screen.getByLabelText(/^Email/), { target: { value: 'anh@example.com' } })
    fireEvent.change(screen.getByLabelText(/Mật khẩu/), { target: { value: 'StrongPassword123' } })
    fireEvent.change(screen.getByLabelText(/Số điện thoại/), { target: { value: '0901234567' } })
    fireEvent.click(screen.getByRole('button', { name: 'Tạo tài khoản' }))
    await waitFor(() => expect(api.registerCustomer).toHaveBeenCalledWith({
      fullName: 'Anh', email: 'anh@example.com', phone: '0901234567', password: 'StrongPassword123',
    }))
    expect(onCustomer).toHaveBeenCalledTimes(1)
  })
  it('validates recovery email and displays server acknowledgement', async () => {
    mount('forgot')
    fireEvent.change(screen.getByLabelText(/^Email/), { target: { value: 'bad-email' } })
    fireEvent.click(screen.getByRole('button', { name: 'Gửi email khôi phục' }))
    expect(await screen.findByText('Email không hợp lệ.')).toBeTruthy()
    expect(api.forgotCustomerPassword).not.toHaveBeenCalled()
    fireEvent.change(screen.getByLabelText(/^Email/), { target: { value: 'anh@example.com' } })
    fireEvent.click(screen.getByRole('button', { name: 'Gửi email khôi phục' }))
    expect(await screen.findByText('Email đã được gửi.')).toBeTruthy()
    expect(api.forgotCustomerPassword).toHaveBeenCalledWith({ email: 'anh@example.com' })
  })
})
