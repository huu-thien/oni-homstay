import { createTheme } from '@mui/material/styles'

export const theme = createTheme({
  palette: {
    primary: { main: '#31594F', dark: '#23453C', light: '#E5ECE7', contrastText: '#FFFFFF' },
    secondary: { main: '#A45C45', dark: '#804633', light: '#F3E5DD', contrastText: '#FFFFFF' },
    background: { default: '#F7F5F0', paper: '#FFFDF9' },
    text: { primary: '#2F2A27', secondary: '#6D6863' },
    divider: '#E8DDD1',
    success: { main: '#47735C', light: '#E8F1EC' },
    warning: { main: '#A67E37', light: '#F5EEDC' },
    error: { main: '#9B4B4B', light: '#F6E7E5' },
    info: { main: '#5A738A', light: '#E8EEF3' },
  },
  typography: {
    fontFamily: '"Inter", "Be Vietnam Pro", "Segoe UI", sans-serif',
    h1: { fontFamily: '"Plus Jakarta Sans", "Inter", "Segoe UI", sans-serif', fontWeight: 800, fontSize: 'clamp(2.55rem, 5.2vw, 4.55rem)', lineHeight: 1.04, letterSpacing: '-0.05em' },
    h2: { fontFamily: '"Plus Jakarta Sans", "Inter", "Segoe UI", sans-serif', fontWeight: 800, fontSize: 'clamp(2rem, 4vw, 3.2rem)', lineHeight: 1.08, letterSpacing: '-0.04em' },
    h3: { fontFamily: '"Plus Jakarta Sans", "Inter", "Segoe UI", sans-serif', fontWeight: 700, fontSize: 'clamp(1.45rem, 3vw, 2rem)', lineHeight: 1.14, letterSpacing: '-0.03em' },
    h4: { fontWeight: 700, letterSpacing: '-0.03em' },
    h5: { fontWeight: 700, letterSpacing: '-0.02em' },
    h6: { fontWeight: 700, letterSpacing: '-0.02em' },
    body1: { lineHeight: 1.78 },
    body2: { lineHeight: 1.72 },
    button: { textTransform: 'none', fontWeight: 700, letterSpacing: '-0.01em' },
  },
  shape: { borderRadius: 18 },
  components: {
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: { minHeight: 46, borderRadius: 14, paddingInline: 20, transition: 'background-color 180ms ease, border-color 180ms ease, transform 180ms ease, box-shadow 180ms ease' },
        containedPrimary: { boxShadow: '0 14px 32px rgba(49, 89, 79, 0.2)', '&:hover': { backgroundColor: '#23453C', transform: 'translateY(-1px)', boxShadow: '0 18px 36px rgba(49, 89, 79, 0.24)' } },
        containedSecondary: { boxShadow: '0 14px 32px rgba(164, 92, 69, 0.16)', '&:hover': { backgroundColor: '#804633', transform: 'translateY(-1px)' } },
        outlinedPrimary: { color: '#23453C', borderColor: '#C8D4CE', backgroundColor: '#FFFDF9', '&:hover': { borderColor: '#31594F', backgroundColor: '#EEF3F0' } },
        textPrimary: { color: '#23453C', '&:hover': { backgroundColor: 'rgba(49,89,79,0.08)' } },
      },
    },
    MuiIconButton: { styleOverrides: { root: { minWidth: 44, minHeight: 44, borderRadius: 14 } } },
    MuiTextField: {
      defaultProps: { fullWidth: true, variant: 'outlined', size: 'medium' },
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 14,
            backgroundColor: '#FFFDF9',
          },
        },
      },
    },
    MuiOutlinedInput: { styleOverrides: { root: { backgroundColor: '#FFFDF9' } } },
    MuiNativeSelect: { styleOverrides: { select: { backgroundColor: '#FFFDF9' } } },
    MuiFormControl: { defaultProps: { size: 'medium' } },
    MuiFormHelperText: { styleOverrides: { root: { '&.Mui-disabled': { color: '#786A63' } } } },
    MuiPaper: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: { backgroundImage: 'none' },
        outlined: { borderColor: '#E8DDD1' },
      },
    },
    MuiCard: {
      defaultProps: { variant: 'outlined' },
      styleOverrides: { root: { borderColor: '#E8DDD1', borderRadius: 24, boxShadow: '0 18px 42px rgba(47, 36, 31, 0.08)' } },
    },
    MuiChip: {
      styleOverrides: {
        root: { borderRadius: 999, fontWeight: 600 },
        outlined: { borderColor: '#E8DDD1', backgroundColor: '#FFFDF9' },
      },
    },
    MuiContainer: { defaultProps: { maxWidth: 'lg' } },
    MuiCssBaseline: {
      styleOverrides: {
        'html': { scrollBehavior: 'smooth' },
        'body': {
          margin: 0,
          background: 'linear-gradient(180deg, #FBF8F2 0%, #F7F5F0 48%, #F3EFE8 100%)',
        },
        'img': { maxWidth: '100%' },
        'a': { color: 'inherit' },
        '::selection': { backgroundColor: 'rgba(49,89,79,0.16)' },
        ':focus-visible': { outline: '3px solid #5A738A', outlineOffset: 3 },
        '@media (prefers-reduced-motion: reduce)': {
          '*, *::before, *::after': { scrollBehavior: 'auto !important', animationDuration: '0.01ms !important', transitionDuration: '0.01ms !important' },
        },
      },
    },
  },
})
