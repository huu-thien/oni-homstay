import { configure } from '@testing-library/react'
import { vi } from 'vitest'
configure({ asyncUtilTimeout: 5000 })

vi.mock('@mui/x-date-pickers/DatePicker', async () => {
  const React = await import('react')
  const dayjs = (await import('dayjs')).default

  return {
    DatePicker: ({
      label,
      value,
      onChange,
      slotProps,
      disabled,
    }: {
      label?: string
      value?: { format: (pattern?: string) => string } | null
      onChange?: (value: ReturnType<typeof dayjs> | null) => void
      slotProps?: { textField?: Record<string, unknown> }
      disabled?: boolean
    }) => {
      const textFieldProps = slotProps?.textField ?? {}
      const currentValue = value ? value.format('YYYY-MM-DD') : ''
      const inputId = String(textFieldProps.id ?? label ?? 'date-input')
      const helperText = textFieldProps.helperText
      const { id: _id, helperText: _helperText, fullWidth: _fullWidth, error: _error, ...inputProps } = textFieldProps

      return React.createElement('label', { htmlFor: inputId, style: { display: 'flex', flexDirection: 'column', gap: 4 } }, [
        React.createElement('span', { key: 'label' }, label),
        React.createElement('input', {
          key: 'input',
          ...inputProps,
          id: inputId,
          'aria-label': label,
          type: 'date',
          value: currentValue,
          disabled,
          onChange: (event: React.ChangeEvent<HTMLInputElement>) => {
            onChange?.(event.target.value ? dayjs(event.target.value) : null)
          },
        }),
        helperText ? React.createElement('small', { key: 'helper' }, String(helperText)) : null,
      ])
    },
  }
})
