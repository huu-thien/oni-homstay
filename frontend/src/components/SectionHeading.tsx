import { Stack, Typography } from '@mui/material'
export function SectionHeading({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return <Stack spacing={2} sx={{ maxWidth: 720 }}>
    <Typography variant="overline" color="primary">{eyebrow}</Typography>
    <Typography variant="h2">{title}</Typography>
    <Typography color="text.secondary">{description}</Typography>
  </Stack>
}
