import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AppBar, Toolbar, Box, Typography, IconButton, Drawer, Stack, Container, Paper } from '@mui/material'
import { alpha } from '@mui/material/styles'
import MenuIcon from '@mui/icons-material/Menu'
import CloseIcon from '@mui/icons-material/Close'
import logoImg from '../assets/logo.png'
import type { AuthMode } from './AuthModal'
import { Button } from './ui'

type HeaderProps = {
  activeNav: 'home' | 'rooms' | 'booking' | 'admin'
  onOpenAuth: (mode: AuthMode) => void
  isAdminAuthenticated: boolean; onAdminLogout: () => void
  customerName: string | null; isCustomerAuthenticated: boolean; onCustomerLogout: () => void
}
export function Header({ activeNav, onOpenAuth, isAdminAuthenticated, onAdminLogout,
  customerName, isCustomerAuthenticated, onCustomerLogout }: HeaderProps) {
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const actions = <>
    <Button
      component={Link}
      to="/"
      variant="ghost"
      aria-current={activeNav === 'home' ? 'page' : undefined}
      sx={activeNav === 'home' ? { bgcolor: 'rgba(49,89,79,0.08)' } : undefined}
    >
      Trang chủ
    </Button>
    <Button component={Link} to="/#rooms" variant="ghost" sx={activeNav === 'rooms' ? { bgcolor: 'rgba(49,89,79,0.08)' } : undefined}>Khám phá phòng</Button>
    {isAdminAuthenticated ? <>
      <Button component={Link} to="/admin" variant="ghost" sx={activeNav === 'admin' ? { bgcolor: 'rgba(49,89,79,0.08)' } : undefined}>Quản trị</Button>
      <Button onClick={onAdminLogout} variant="ghost">Đăng xuất</Button>
    </> : isCustomerAuthenticated ? <>
      <Paper variant="outlined" sx={{ px: 2.25, py: 1.25, borderRadius: '999px', bgcolor: 'background.paper', boxShadow: '0 8px 20px rgba(47,36,31,0.06)' }}>
        <Typography variant="body2" sx={{ alignSelf: 'center' }}>Xin chào, <strong>{customerName}</strong></Typography>
      </Paper>
      <Button onClick={onCustomerLogout} variant="ghost">Đăng xuất</Button>
    </> : <>
      <Button onClick={() => onOpenAuth('login')} variant="ghost">Đăng nhập</Button>
      <Button variant="outline" onClick={() => onOpenAuth('register')}>Đăng ký</Button>
    </>}
    <Button variant="primary" component={Link} to="/#booking-search">Đặt phòng ngay</Button>
  </>
  return <AppBar
    position="sticky"
    color="inherit"
    elevation={0}
    sx={{
      borderBottom: 1,
      borderColor: scrolled ? 'rgba(232,221,209,0.88)' : 'transparent',
      bgcolor: scrolled ? 'rgba(255,253,249,0.82)' : 'rgba(255,253,249,0.58)',
      backdropFilter: 'blur(20px)',
      transition: 'background-color 180ms ease, border-color 180ms ease, box-shadow 180ms ease',
      boxShadow: scrolled ? '0 16px 42px rgba(47, 36, 31, 0.08)' : 'none',
    }}
  >
    <Container><Toolbar disableGutters sx={{ gap: 2, py: { xs: 1.25, md: 1.5 } }}>
      <Box component={Link} to="/" sx={{ display: 'flex', alignItems: 'center', gap: 1, textDecoration: 'none',
        color: 'primary.main', flexGrow: 1 }}>
        <Box component="img" src={logoImg} alt="" sx={{ height: 48, width: 48, objectFit: 'contain', borderRadius: '14px', boxShadow: '0 12px 28px rgba(47,36,31,0.14)' }} />
        <Box>
          <Typography fontWeight={800}>O Ni Homestay</Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary', display: { xs: 'none', sm: 'block' } }}>
            Boutique stay between soft light and quiet gardens
          </Typography>
        </Box>
      </Box>
      <Stack component="nav" aria-label="Điều hướng chính" direction="row" spacing={1}
        sx={{
          display: { xs: 'none', lg: 'flex' },
          alignItems: 'center',
          p: 0.75,
          borderRadius: '999px',
          bgcolor: alpha('#FFFFFF', 0.76),
          border: '1px solid rgba(232,221,209,0.9)',
          boxShadow: '0 14px 34px rgba(47,36,31,0.06)',
        }}
      >
        {actions}
      </Stack>
      <IconButton aria-label="Mở menu" aria-expanded={open} onClick={() => setOpen(true)}
        sx={{ display: { lg: 'none' }, bgcolor: 'rgba(255,255,255,0.75)', border: '1px solid rgba(232,221,209,0.9)' }}><MenuIcon /></IconButton>
    </Toolbar></Container>
    <Drawer anchor="right" open={open} onClose={() => setOpen(false)}>
      <Stack component="nav" aria-label="Điều hướng trên điện thoại" spacing={2} sx={{ width: 'min(360px, 90vw)', p: 3, height: '100%', bgcolor: 'background.default' }}
        onClick={() => setOpen(false)}>
        <IconButton aria-label="Đóng menu" sx={{ alignSelf: 'flex-end' }}><CloseIcon /></IconButton>
        <Typography variant="h6">Khám phá O Ni Homestay</Typography>
        <Typography variant="body2" color="text.secondary">Đặt phòng nhanh, xem không gian trực quan và theo dõi kỳ nghỉ thật nhẹ nhàng.</Typography>
        {actions}
      </Stack>
    </Drawer>
  </AppBar>
}
