# Shared MUI controls

These adapters retain existing form event/value contracts while delegating
rendering, focus behavior and styling to Material UI 6.

| Export | MUI primitive | Extra props |
| --- | --- | --- |
| `Input` | `TextField` | `label`, `error`, `hint`, `size: sm/md/lg` |
| `TextArea` | Multiline `TextField` | `label`, `error`, `hint`, `rows` |
| `Select` | `FormControl` + `NativeSelect` | `label`, `error`, `hint`, native option children |
| `Button` | `Button` + `CircularProgress` | `variant: primary/secondary/outline/ghost/danger`, `isLoading` |
| `Badge` | `Chip` | `variant: default/primary/secondary/success/warning/danger` |
| `DateRangePicker` | Two MUI X `DatePicker`s | Date-only values, change callbacks, `error`, `hint`, `disabled` |

Prefer direct MUI components for new complex forms. Reuse `theme.ts` instead
of adding component-specific CSS or independent color palettes.

```tsx
<Input
  label="Email"
  type="email"
  autoComplete="email"
  value={email}
  onChange={(event) => setEmail(event.target.value)}
  error={errors.email}
/>
```

`DateRangePicker` accepts and emits `YYYY-MM-DD`, displays `DD/MM/YYYY`,
and defaults its minimum arrival to today's date in Hue. The checkout minimum
is the next day. `bookedDates`, when supplied by a future real API, disables
those dates and intervals crossing them; the current API does not supply it.
There is no arbitrary six-month limit unless callers explicitly provide
`maxMonths`. A date picker is not a substitute for stay validation or server
availability checks.

All date pickers require the shared `LocalizationProvider` from `main.tsx`.
