import { useId, type InputHTMLAttributes } from 'react'
import { TextField } from '@mui/material'

export type InputSize = 'sm' | 'md' | 'lg'
export type InputType = 'text' | 'email' | 'tel' | 'number' | 'password' | 'url'
type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> & {
  size?: InputSize; error?: string; hint?: string; label?: string
}

export function Input({ size = 'md', error, hint, label, id, className, style, onChange, value, defaultValue,
  disabled, required, type = 'text', ...props }: InputProps) {
  const generatedId = useId()
  return <TextField id={id ?? generatedId} label={label} type={type} value={value} defaultValue={defaultValue}
    onChange={onChange} disabled={disabled} required={required} error={Boolean(error)} helperText={error ?? hint}
    size={size === 'sm' ? 'small' : 'medium'} className={className} style={style}
    slotProps={{ htmlInput: props }} />
}
