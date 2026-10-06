import type { ReactNode } from 'react'
import { Button as MuiButton, CircularProgress, type ButtonProps as MuiButtonProps } from '@mui/material'

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
export type ButtonSize = 'sm' | 'md' | 'lg'
type ButtonProps = Omit<MuiButtonProps, 'variant' | 'size' | 'color' | 'children'> & {
  variant?: ButtonVariant
  size?: ButtonSize
  color?: MuiButtonProps['color']
  isLoading?: boolean
  children?: ReactNode
  [key: string]: unknown
}

export function Button({
  variant = 'primary',
  size = 'md',
  color,
  isLoading,
  disabled,
  children,
  type = 'button',
  sx,
  ...props
}: ButtonProps) {
  const muiVariant = variant === 'outline' ? 'outlined' : variant === 'ghost' ? 'text' : 'contained'
  const muiColor = color ?? (variant === 'danger' ? 'error' : variant === 'secondary' ? 'secondary' : 'primary')

  return (
    <MuiButton
      {...props}
      type={type}
      disabled={disabled || isLoading}
      aria-busy={isLoading}
      variant={muiVariant}
      color={muiColor}
      size={size === 'sm' ? 'small' : size === 'lg' ? 'large' : 'medium'}
      startIcon={isLoading ? <CircularProgress size={18} color="inherit" /> : props.startIcon}
      sx={[
        variant === 'outline'
          ? { color: 'primary.dark', borderColor: '#A5B4AC', backgroundColor: 'background.paper',
            '&:hover': { borderColor: 'primary.main', backgroundColor: '#F0F4F0' } }
          : {},
        variant === 'ghost'
          ? { color: 'primary.dark', '&:hover': { backgroundColor: 'rgba(49,89,79,0.08)', color: 'primary.dark' } }
          : {},
        ...(Array.isArray(sx) ? sx : sx ? [sx] : []),
      ]}
    >
      {children}
    </MuiButton>
  )
}
