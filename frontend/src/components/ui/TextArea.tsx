import { useId, type TextareaHTMLAttributes } from 'react'
import { TextField } from '@mui/material'

type TextAreaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & { error?: string; hint?: string; label?: string }
export function TextArea({ error, hint, label, id, rows = 4, onChange, value, defaultValue, disabled,
  required, className, style, ...props }: TextAreaProps) {
  const generatedId = useId()
  return <TextField id={id ?? generatedId} label={label} multiline minRows={rows} onChange={onChange}
    value={value} defaultValue={defaultValue} disabled={disabled} required={required}
    error={Boolean(error)} helperText={error ?? hint} className={className} style={style}
    slotProps={{ htmlInput: props }} />
}
