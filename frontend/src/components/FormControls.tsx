import { useId, type InputHTMLAttributes, type ReactNode, Children, cloneElement, isValidElement } from 'react'
import { Stack, FormLabel, FormHelperText, TextField, Pagination } from '@mui/material'

export function FieldShell({ label, hint, children }: { label?: string; hint?: string; children: ReactNode }) {
  const id = useId()
  return <Stack spacing={1}>
    {label && <FormLabel htmlFor={id}>{label}</FormLabel>}
    {Children.map(children, (child) => isValidElement<{ id?: string; 'aria-describedby'?: string }>(child)
      ? cloneElement(child, { id, 'aria-describedby': hint ? `${id}-hint` : undefined }) : child)}
    {hint && <FormHelperText id={`${id}-hint`}>{hint}</FormHelperText>}
  </Stack>
}
export function DateInput({ className, style, onChange, value, defaultValue, disabled, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <TextField type="date" className={className} style={style} onChange={onChange} value={value}
    defaultValue={defaultValue} disabled={disabled} slotProps={{ htmlInput: props }} />
}
export { Input as TextInput, Select as SelectInput, TextArea as TextAreaInput } from './ui'
export type { InputType as TextInputType } from './ui'
export function PaginationControls({ page, totalPages, onPageChange }: {
  page: number; totalPages: number; onPageChange: (page: number) => void
}) {
  return totalPages > 1 ? <Pagination sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}
    count={totalPages} page={page} onChange={(_, next) => onPageChange(next)} color="primary"
    getItemAriaLabel={(type, number) => type === 'page' ? `Trang ${number}` : type === 'next' ? 'Trang tiếp' : 'Trang trước'} /> : null
}
