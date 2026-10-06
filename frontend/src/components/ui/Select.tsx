import { useId, type SelectHTMLAttributes } from 'react'
import { FormControl, InputLabel, NativeSelect, FormHelperText } from '@mui/material'

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & { error?: string; hint?: string; label?: string }
export function Select({ error, hint, label, id, disabled, required, children, className, style,
  value, defaultValue, onChange, ...props }: SelectProps) {
  const generatedId = useId()
  const controlId = id ?? generatedId
  return <FormControl fullWidth error={Boolean(error)} disabled={disabled} required={required}
    className={className} style={style}>
    {label && <InputLabel variant="standard" htmlFor={controlId}>{label}</InputLabel>}
    <NativeSelect value={value} defaultValue={defaultValue} onChange={onChange} inputProps={{ ...props, id: controlId,
      'aria-describedby': error || hint ? `${controlId}-helper` : undefined }}>
      {children}
    </NativeSelect>
    {(error || hint) && <FormHelperText id={`${controlId}-helper`}>{error ?? hint}</FormHelperText>}
  </FormControl>
}
