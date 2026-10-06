import type { ReactNode } from 'react'
import { Chip, type ChipProps } from '@mui/material'

export type BadgeVariant = 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info'
type BadgeProps = Omit<ChipProps, 'variant' | 'color' | 'label' | 'children'> & {
  variant?: BadgeVariant
  children: ReactNode
}

const badgeStyles: Record<BadgeVariant, object> = {
  default: { backgroundColor: '#F4F1EB', color: '#454B47', borderColor: '#E3DED5' },
  primary: { backgroundColor: '#E5ECE6', color: '#294B41', borderColor: '#CCD9CE' },
  secondary: { backgroundColor: '#F1E2DA', color: '#754332', borderColor: '#E3CBBE' },
  success: { backgroundColor: '#E7F0E8', color: '#28533B', borderColor: '#CFE0D1' },
  warning: { backgroundColor: '#F5EEDC', color: '#684910', borderColor: '#E9DDBD' },
  danger: { backgroundColor: '#F5E6E2', color: '#7F3534', borderColor: '#E8CCC6' },
  info: { backgroundColor: '#E7EEF0', color: '#305562', borderColor: '#CCDDE1' },
}

export function Badge({ variant = 'default', children, sx, ...props }: BadgeProps) {
  return (
    <Chip
      {...props}
      label={children}
      variant="outlined"
      sx={[{ fontWeight: 700, borderRadius: '999px', height: 32 }, badgeStyles[variant], ...(Array.isArray(sx) ? sx : sx ? [sx] : [])]}
    />
  )
}
