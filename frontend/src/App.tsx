import { lazy, Suspense, useMemo, useState } from 'react'
import { Box, CircularProgress, Link as MuiLink } from '@mui/material'
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { AuthModal, type AuthMode } from './components/AuthModal'
import { Footer } from './components/Footer'
import { Header } from './components/Header'
import { ToastProvider } from './components/ToastContext'
import { useToast } from './components/useToast'
import {
  clearAdminSession,
  getAdminSession,
  setAdminSession,
  type AdminSession,
} from './lib/adminAuth'
import {
  clearCustomerSession,
  getCustomerSession,
  setCustomerSession,
  type CustomerSession,
} from './lib/customerAuth'
import { HomePage } from './pages/HomePage'
const AdminDashboardPage = lazy(() => import('./pages/AdminDashboardPage').then((module) => ({ default: module.AdminDashboardPage })))
const BookingPage = lazy(() => import('./pages/BookingPage').then((module) => ({ default: module.BookingPage })))
const RoomDetailPage = lazy(() => import('./pages/RoomDetailPage').then((module) => ({ default: module.RoomDetailPage })))

function AppContent() {
  const navigate = useNavigate()
  const toast = useToast()
  const [authMode, setAuthMode] = useState<AuthMode | null>(null)
  const [adminSession, setAdminSessionState] = useState<AdminSession | null>(() => getAdminSession())
  const [customerSession, setCustomerSessionState] = useState<CustomerSession | null>(() => getCustomerSession())
  const location = useLocation()
  const isAdminRoute = location.pathname.startsWith('/admin')

  const activeNav = useMemo(() => {
    if (location.pathname.startsWith('/admin')) {
      return 'admin'
    }

    if (location.pathname.startsWith('/booking')) {
      return 'booking'
    }

    if (location.pathname.startsWith('/rooms')) {
      return 'rooms'
    }

    return 'home'
  }, [location.pathname])

  const handleAdminLoginSuccess = (session: AdminSession) => {
    setAdminSession(session)
    setAdminSessionState(session)
    clearCustomerSession()
    setCustomerSessionState(null)
    setAuthMode(null)
    toast.success(`Đăng nhập Quản trị viên thành công. Xin chào ${session.user.fullName || 'Admin'}!`)
    navigate('/admin')
  }

  const handleAdminLogout = () => {
    clearAdminSession()
    setAdminSessionState(null)
    toast.info('Đã đăng xuất tài khoản Quản trị viên.')
    navigate('/')
  }

  const handleCustomerAuthSuccess = (session: CustomerSession) => {
    setCustomerSession(session)
    setCustomerSessionState(session)
    setAuthMode(null)
    toast.success(`Xin chào ${session.user.fullName}! Đăng nhập thành công.`)
  }

  const handleCustomerLogout = () => {
    clearCustomerSession()
    setCustomerSessionState(null)
    toast.info('Đã đăng xuất tài khoản thành công.')
  }

  return (
    <Box sx={{ minHeight: '100vh' }}>
      <MuiLink href="#main-content" sx={{ position: 'fixed', top: -80, left: 16, zIndex: 1600,
        bgcolor: 'background.paper', p: 2, '&:focus': { top: 8 } }}>Bỏ qua điều hướng</MuiLink>
      {!isAdminRoute && (
        <Header
          activeNav={activeNav}
          onOpenAuth={setAuthMode}
          isAdminAuthenticated={Boolean(adminSession)}
          onAdminLogout={handleAdminLogout}
          customerName={customerSession?.user.fullName ?? null}
          isCustomerAuthenticated={Boolean(customerSession)}
          onCustomerLogout={handleCustomerLogout}
        />
      )}

      <Box id="main-content" tabIndex={-1}>
      <Suspense fallback={<Box sx={{ py: 8, textAlign: 'center' }}><CircularProgress aria-label="Đang tải trang" /></Box>}>
      <Routes>
        <Route path="/" element={<HomePage onOpenAuth={setAuthMode} />} />
        <Route path="/rooms/:slug" element={<RoomDetailPage />} />
        <Route path="/booking/:slug" element={<BookingPage key={location.pathname} onOpenAuth={setAuthMode} customerSession={customerSession} />} />
        <Route
          path="/admin"
          element={
            adminSession ? (
              <AdminDashboardPage
                onAdminLogout={handleAdminLogout}
              />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </Suspense>
      </Box>

      {!isAdminRoute && <Footer />}

      <AuthModal
        mode={authMode}
        onClose={() => setAuthMode(null)}
        onChangeMode={setAuthMode}
        onAdminLoginSuccess={handleAdminLoginSuccess}
        onCustomerAuthSuccess={handleCustomerAuthSuccess}
      />
    </Box>
  )
}

function App() {
  return (
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  )
}

export default App
