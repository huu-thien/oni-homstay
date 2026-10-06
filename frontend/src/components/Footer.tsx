import { Box, Container, Divider, Grid2 as Grid, Stack, Typography } from '@mui/material'
import { alpha } from '@mui/material/styles'
import { Badge } from './ui'
import logoImg from '../assets/logo.png'

export function Footer() {
  return <Box component="footer" sx={{ mt: 10, py: { xs: 5, md: 7 } }}>
    <Container>
      <Box sx={{
        p: { xs: 3, md: 4.5 },
        borderRadius: '28px',
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: alpha('#FFFDF9', 0.92),
        boxShadow: '0 24px 64px rgba(47, 36, 31, 0.08)',
        backdropFilter: 'blur(12px)',
      }}>
        <Grid container spacing={4} alignItems="start">
          <Grid size={{ xs: 12, md: 5 }}>
            <Stack direction="row" spacing={1.25} alignItems="center">
              <Box component="img" src={logoImg} alt="" sx={{ width: 44, height: 44, objectFit: 'contain', borderRadius: '14px' }} />
              <Box>
                <Typography variant="h6">O Ni Homestay</Typography>
                <Typography variant="caption" color="text.secondary">Boutique stay in Hue</Typography>
              </Box>
            </Stack>
            <Badge variant="secondary" sx={{ mt: 2 }}>Boutique stay in Hue</Badge>
            <Typography variant="h5" sx={{ mt: 2.25, maxWidth: 520 }}>Một nơi ở sáng, tinh tế và đủ riêng tư để thảnh thơi.</Typography>
            <Typography color="text.secondary" sx={{ mt: 1.5, maxWidth: 520 }}>
              Đặt phòng trực tiếp, nhận xác nhận nhanh và tận hưởng một trải nghiệm lưu trú hiện đại, chỉn chu hơn.
            </Typography>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Typography variant="subtitle1" fontWeight={700}>Trải nghiệm</Typography>
            <Stack spacing={1.25} sx={{ mt: 1.5 }}>
              <Typography color="text.secondary">Guest checkout nhanh chóng</Typography>
              <Typography color="text.secondary">Thanh toán QR và xác nhận tự động</Typography>
              <Typography color="text.secondary">Theo dõi booking minh bạch</Typography>
            </Stack>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <Typography variant="subtitle1" fontWeight={700}>Lưu trú tại Huế</Typography>
            <Stack spacing={1.25} sx={{ mt: 1.5 }}>
              <Typography color="text.secondary">Chính sách nhận và trả phòng hiển thị rõ ở từng phòng.</Typography>
              <Typography color="text.secondary">Mọi thông tin lưu trú được gửi vào email bạn cung cấp.</Typography>
              <Typography color="text.secondary">Không gian lưu trú ưu tiên ánh sáng, cảm xúc và tính riêng tư.</Typography>
            </Stack>
          </Grid>
        </Grid>
        <Divider sx={{ my: 3 }} />
        <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={1.5}>
          <Typography variant="body2" color="text.secondary">© O Ni Homestay. Designed for a calm, direct and modern booking flow.</Typography>
          <Typography variant="body2" color="text.secondary">Hue boutique mood · direct booking · clear payment status</Typography>
        </Stack>
      </Box>
    </Container>
  </Box>
}
