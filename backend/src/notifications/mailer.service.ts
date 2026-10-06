import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import nodemailer from 'nodemailer';
import { Repository } from 'typeorm';

import { BookingEntity } from '../database/entities/booking.entity';
import { EmailLogEntity } from '../database/entities/email-log.entity';
import { UserEntity } from '../database/entities/user.entity';

type SendEmailInput = {
  emailType: string;
  dedupeKey: string;
  recipient: string;
  subject: string;
  html: string;
  text: string;
  booking?: BookingEntity | null;
  user?: UserEntity | null;
  payload?: Record<string, unknown>;
};

@Injectable()
export class MailerService implements OnModuleInit {
  private readonly logger = new Logger(MailerService.name);

  private readonly transporter = this.createTransporter();

  private readonly from = process.env.EMAIL_FROM;

  constructor(
    @InjectRepository(EmailLogEntity)
    private readonly emailLogRepository: Repository<EmailLogEntity>,
  ) {}

  async onModuleInit() {
    try {
      await this.transporter.verify();
      this.logger.log('SMTP AUTH OK');
    } catch (error) {
      this.logger.error(
        'SMTP AUTH FAILED',
        error instanceof Error ? error.stack : error,
      );
    }
  }

  async testSmtp() {
    try {
      await this.transporter.verify();
      this.logger.log('SMTP AUTH OK');
    } catch (error) {
      this.logger.error(
        'SMTP AUTH FAILED',
        error instanceof Error ? error.stack : error,
      );
    }
  }

  async sendResetPasswordEmail(input: {
    recipient: string;
    fullName: string;
    resetToken: string;
    user?: UserEntity | null;
  }) {
    const resetUrl = `${
      process.env.FRONTEND_URL ?? 'http://localhost:5173'
    }/reset-password?token=${encodeURIComponent(input.resetToken)}`;

    return this.sendEmail({
      emailType: 'RESET_PASSWORD',
      dedupeKey: `reset-password:${input.resetToken}`,
      recipient: input.recipient,
      subject: 'Oni Homestay | Đặt lại mật khẩu',
      user: input.user ?? null,
      payload: { resetUrl },

      text: [
        `Xin chào ${input.fullName},`,
        '',
        'Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản Oni Homestay của bạn.',
        '',
        `Vui lòng truy cập liên kết sau để đặt lại mật khẩu:`,
        resetUrl,
        '',
        'Liên kết có hiệu lực trong 30 phút.',
        '',
        'Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email.',
        '',
        'Trân trọng,',
        'Đội ngũ Oni Homestay',
      ].join('\n'),

      html: `
        ${getEmailLayout({
          title: 'Đặt lại mật khẩu',
          content: `
            <p style="margin:0 0 20px;font-size:16px;color:#374151;line-height:1.7;">
              Xin chào <strong>${escapeHtml(input.fullName)}</strong>,
            </p>

            <p style="margin:0 0 20px;font-size:15px;color:#4b5563;line-height:1.7;">
              Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản
              <strong>Oni Homestay</strong> của bạn.
            </p>

            <div style="margin:28px 0;text-align:center;">
              <a
                href="${escapeHtml(resetUrl)}"
                style="
                  display:inline-block;
                  padding:13px 28px;
                  background:#83311b;
                  color:#ffffff;
                  text-decoration:none;
                  border-radius:8px;
                  font-size:15px;
                  font-weight:600;
                "
              >
                🔐 Đặt lại mật khẩu
              </a>
            </div>

            <p style="margin:0 0 12px;font-size:14px;color:#6b7280;line-height:1.6;">
              Hoặc bạn có thể truy cập liên kết:
            </p>

            <p style="
              margin:0 0 20px;
              padding:12px 14px;
              background:#f9fafb;
              border-radius:6px;
              word-break:break-all;
              font-size:13px;
              color:#6b7280;
            ">
              ${escapeHtml(resetUrl)}
            </p>

            <div style="
              margin-top:24px;
              padding:14px 16px;
              background:#fff7ed;
              border-left:4px solid #f59e0b;
              border-radius:4px;
            ">
              <p style="margin:0;font-size:14px;color:#92400e;line-height:1.6;">
                ⏱️ Liên kết này có hiệu lực trong <strong>30 phút</strong>.
              </p>
            </div>

            <p style="margin:24px 0 0;font-size:14px;color:#6b7280;line-height:1.6;">
              Nếu bạn không yêu cầu đặt lại mật khẩu, bạn có thể bỏ qua email này.
              Tài khoản của bạn vẫn an toàn.
            </p>
          `,
        })}
      `,
    });
  }

  async sendBookingConfirmation(input: {
    booking: BookingEntity;
    recipient: string;
    roomName: string;
  }) {
    const booking = input.booking;
    const roomPassword = booking.room?.password ?? '';
    const totalAmount = Number(booking.totalAmount).toLocaleString('vi-VN');

    return this.sendEmail({
      emailType: 'BOOKING_CONFIRMATION',
      dedupeKey: `booking-confirmation:${booking.bookingCode}`,
      recipient: input.recipient,

      subject: `Oni Homestay | Xác nhận đặt phòng ${booking.bookingCode}`,

      booking,
      user: booking.user,

      payload: {
        bookingCode: booking.bookingCode,
        roomName: input.roomName,
        roomPassword,
      },

      text: [
        `Xin chào ${booking.guestName},`,
        '',
        '🎉 ĐẶT PHÒNG CỦA BẠN ĐÃ ĐƯỢC XÁC NHẬN',
        '',
        `Mã đặt phòng: ${booking.bookingCode}`,
        `Phòng: ${input.roomName}`,
        `Check-in: ${booking.checkInDate}`,
        `Check-out: ${booking.checkOutDate}`,
        `Số khách: ${booking.guestCount}`,
        `Tổng tiền: ${totalAmount} VND`,
        ...(roomPassword
          ? [
              '',
              `🔑 Mật khẩu phòng: ${roomPassword}`,
              '(Sử dụng mật khẩu này để check-in tự động.)',
            ]
          : []),
        '',
        'Cảm ơn bạn đã lựa chọn Oni Homestay.',
        '',
        'Trân trọng,',
        'Đội ngũ Oni Homestay',
      ].join('\n'),

      html: `
        ${getEmailLayout({
          title: 'Đặt phòng thành công',
          badge: '✓ ĐÃ XÁC NHẬN',
          badgeColor: '#166534',

          content: `
            <p style="margin:0 0 8px;font-size:16px;color:#374151;">
              Xin chào <strong>${escapeHtml(booking.guestName)}</strong>,
            </p>

            <p style="
              margin:0 0 24px;
              font-size:15px;
              color:#4b5563;
              line-height:1.7;
            ">
              Cảm ơn bạn đã đặt phòng tại <strong>Oni Homestay</strong>.
              Đặt phòng của bạn đã được xác nhận thành công.
            </p>

            <div style="
              padding:20px;
              background:#faf7f5;
              border:1px solid #eadfd9;
              border-radius:10px;
              margin-bottom:24px;
            ">
              <div style="
                margin-bottom:16px;
                font-size:13px;
                color:#6b7280;
                text-transform:uppercase;
                letter-spacing:.5px;
              ">
                Mã đặt phòng
              </div>

              <div style="
                font-size:22px;
                font-weight:700;
                color:#83311b;
                letter-spacing:1px;
              ">
                ${escapeHtml(booking.bookingCode)}
              </div>
            </div>

            <h3 style="
              margin:0 0 14px;
              font-size:16px;
              color:#1f2937;
            ">
              🏡 Thông tin đặt phòng
            </h3>

            <table
              cellpadding="0"
              cellspacing="0"
              width="100%"
              style="
                border-collapse:collapse;
                margin-bottom:24px;
                font-size:14px;
              "
            >
              <tr>
                <td style="
                  padding:11px 0;
                  color:#6b7280;
                  width:42%;
                  border-bottom:1px solid #f0f0f0;
                ">
                  Phòng
                </td>
                <td style="
                  padding:11px 0;
                  color:#1f2937;
                  font-weight:600;
                  border-bottom:1px solid #f0f0f0;
                ">
                  ${escapeHtml(input.roomName)}
                </td>
              </tr>

              <tr>
                <td style="
                  padding:11px 0;
                  color:#6b7280;
                  border-bottom:1px solid #f0f0f0;
                ">
                  Check-in
                </td>
                <td style="
                  padding:11px 0;
                  color:#1f2937;
                  font-weight:500;
                  border-bottom:1px solid #f0f0f0;
                ">
                  📅 ${escapeHtml(booking.checkInDate)}
                </td>
              </tr>

              <tr>
                <td style="
                  padding:11px 0;
                  color:#6b7280;
                  border-bottom:1px solid #f0f0f0;
                ">
                  Check-out
                </td>
                <td style="
                  padding:11px 0;
                  color:#1f2937;
                  font-weight:500;
                  border-bottom:1px solid #f0f0f0;
                ">
                  📅 ${escapeHtml(booking.checkOutDate)}
                </td>
              </tr>

              <tr>
                <td style="
                  padding:11px 0;
                  color:#6b7280;
                  border-bottom:1px solid #f0f0f0;
                ">
                  Số khách
                </td>
                <td style="
                  padding:11px 0;
                  color:#1f2937;
                  font-weight:500;
                  border-bottom:1px solid #f0f0f0;
                ">
                  👥 ${booking.guestCount} người
                </td>
              </tr>

              <tr>
                <td style="padding:14px 0 4px;color:#6b7280;">
                  Tổng tiền
                </td>
                <td style="
                  padding:14px 0 4px;
                  color:#83311b;
                  font-size:18px;
                  font-weight:700;
                ">
                  ${totalAmount} VND
                </td>
              </tr>
            </table>

            ${
              roomPassword
                ? `
                  <div style="
                    padding:18px 20px;
                    background:#fff8f3;
                    border:1px solid #f1d6c5;
                    border-radius:10px;
                    margin-bottom:24px;
                  ">
                    <div style="
                      margin-bottom:8px;
                      color:#83311b;
                      font-size:15px;
                      font-weight:700;
                    ">
                      🔑 Mật khẩu phòng
                    </div>

                    <div style="
                      margin-bottom:8px;
                      font-size:22px;
                      font-weight:700;
                      letter-spacing:2px;
                      color:#83311b;
                    ">
                      ${escapeHtml(roomPassword)}
                    </div>

                    <div style="
                      font-size:13px;
                      color:#6b7280;
                      line-height:1.6;
                    ">
                      Sử dụng mật khẩu này để check-in tự động.
                    </div>
                  </div>
                `
                : ''
            }

            <div style="
              padding:16px;
              background:#f0fdf4;
              border-left:4px solid #22c55e;
              border-radius:4px;
            ">
              <p style="
                margin:0;
                font-size:14px;
                color:#166534;
                line-height:1.6;
              ">
                ✓ Vui lòng lưu lại mã đặt phòng để thuận tiện khi cần hỗ trợ.
              </p>
            </div>

            <p style="
              margin:24px 0 0;
              font-size:14px;
              color:#6b7280;
              line-height:1.7;
            ">
              Chúc bạn có một kỳ nghỉ thật thoải mái tại Oni Homestay.
              Nếu cần hỗ trợ, vui lòng liên hệ với chúng tôi.
            </p>
          `,
        })}
      `,
    });
  }

  async sendAutoAccountEmail(input: {
    booking: BookingEntity;
    user: UserEntity;
    temporaryPassword: string;
  }) {
    return this.sendEmail({
      emailType: 'AUTO_ACCOUNT',
      dedupeKey: `auto-account:${input.booking.bookingCode}`,
      recipient: input.user.email,

      subject: 'Oni Homestay | Tài khoản của bạn đã được tạo',

      booking: input.booking,
      user: input.user,

      payload: {
        email: input.user.email,
      },

      text: [
        `Xin chào ${input.user.fullName},`,
        '',
        '🎉 TÀI KHOẢN ONI HOMESTAY ĐÃ ĐƯỢC TẠO',
        '',
        'Hệ thống đã tự động tạo tài khoản cho bạn sau lần đặt phòng đầu tiên.',
        '',
        `Email đăng nhập: ${input.user.email}`,
        `Mật khẩu tạm thời: ${input.temporaryPassword}`,
        '',
        '⚠️ Vui lòng đăng nhập và đổi mật khẩu ngay sau khi truy cập hệ thống.',
        '',
        'Trân trọng,',
        'Đội ngũ Oni Homestay',
      ].join('\n'),

      html: `
        ${getEmailLayout({
          title: 'Tài khoản của bạn đã được tạo',
          badge: '✓ TÀI KHOẢN MỚI',
          badgeColor: '#2563eb',

          content: `
            <p style="
              margin:0 0 8px;
              font-size:16px;
              color:#374151;
            ">
              Xin chào <strong>${escapeHtml(input.user.fullName)}</strong>,
            </p>

            <p style="
              margin:0 0 24px;
              font-size:15px;
              color:#4b5563;
              line-height:1.7;
            ">
              Cảm ơn bạn đã sử dụng dịch vụ của <strong>Oni Homestay</strong>.
              Sau lần đặt phòng đầu tiên, hệ thống đã tự động tạo tài khoản
              để bạn có thể quản lý thông tin và các booking của mình.
            </p>

            <div style="
              padding:20px;
              background:#f8fafc;
              border:1px solid #e2e8f0;
              border-radius:10px;
              margin-bottom:24px;
            ">
              <h3 style="
                margin:0 0 16px;
                font-size:16px;
                color:#1f2937;
              ">
                🔐 Thông tin đăng nhập
              </h3>

              <div style="margin-bottom:14px;">
                <div style="
                  margin-bottom:5px;
                  font-size:12px;
                  color:#6b7280;
                ">
                  EMAIL
                </div>

                <div style="
                  font-size:15px;
                  color:#1f2937;
                  font-weight:600;
                ">
                  ${escapeHtml(input.user.email)}
                </div>
              </div>

              <div>
                <div style="
                  margin-bottom:5px;
                  font-size:12px;
                  color:#6b7280;
                ">
                  MẬT KHẨU TẠM THỜI
                </div>

                <div style="
                  display:inline-block;
                  padding:9px 14px;
                  background:#ffffff;
                  border:1px solid #d1d5db;
                  border-radius:6px;
                  font-size:16px;
                  color:#83311b;
                  font-weight:700;
                  letter-spacing:1px;
                ">
                  ${escapeHtml(input.temporaryPassword)}
                </div>
              </div>
            </div>

            <div style="
              padding:16px;
              background:#fff7ed;
              border-left:4px solid #f59e0b;
              border-radius:4px;
              margin-bottom:24px;
            ">
              <p style="
                margin:0;
                font-size:14px;
                color:#92400e;
                line-height:1.7;
              ">
                ⚠️ <strong>Lưu ý bảo mật:</strong>
                Đây là mật khẩu tạm thời. Vui lòng đăng nhập và đổi mật khẩu
                ngay sau khi truy cập hệ thống.
              </p>
            </div>

            <p style="
              margin:0;
              font-size:14px;
              color:#6b7280;
              line-height:1.7;
            ">
              Tài khoản của bạn sẽ giúp bạn thuận tiện hơn trong việc theo dõi
              booking và sử dụng các dịch vụ tại Oni Homestay.
            </p>
          `,
        })}
      `,
    });
  }

  private async sendEmail(input: SendEmailInput) {
    const existing = await this.emailLogRepository.findOne({
      where: { dedupeKey: input.dedupeKey },
    });

    if (existing?.status === 'SENT') {
      return existing;
    }

    const log =
      existing ??
      this.emailLogRepository.create({
        emailType: input.emailType,
        dedupeKey: input.dedupeKey,
        recipient: input.recipient,
        subject: input.subject,
        status: 'PENDING',
        booking: input.booking ?? null,
        user: input.user ?? null,
        payload: input.payload ? JSON.stringify(input.payload) : null,
      });

    await this.emailLogRepository.save(log);

    try {
      const info = await this.dispatchEmail(input);

      log.status = 'SENT';
      log.sentAt = new Date();
      log.errorMessage = null;
      log.payload = JSON.stringify({
        ...(input.payload ?? {}),
        messageId: info.messageId,
      });

      await this.emailLogRepository.save(log);

      return log;
    } catch (error) {
      log.status = 'FAILED';
      log.errorMessage =
        error instanceof Error ? error.message : 'Unknown email error';

      await this.emailLogRepository.save(log);

      this.logger.error(
        `Send email failed for ${input.dedupeKey}`,
        error instanceof Error ? error.stack : undefined,
      );

      throw error;
    }
  }

  private createTransporter() {
    const host = process.env.SMTP_HOST;
    if (!host) {
      this.logger.warn('SMTP_HOST not set - emails will not be sent');
    }

    return nodemailer.createTransport({
      host,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: process.env.SMTP_SECURE === 'true',
      auth: process.env.SMTP_USER
        ? {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          }
        : undefined,
    });
  }

  private async dispatchEmail(input: SendEmailInput) {
    return this.transporter.sendMail({
      from: this.from,
      to: input.recipient,
      subject: input.subject,
      text: input.text,
      html: input.html,
    });
  }
}

function getEmailLayout(input: {
  title: string;
  content: string;
  badge?: string;
  badgeColor?: string;
}) {
  return `
    <!DOCTYPE html>
    <html lang="vi">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${escapeHtml(input.title)}</title>
      </head>

      <body style="
        margin:0;
        padding:0;
        background:#f4f4f5;
        font-family:Arial,Helvetica,sans-serif;
        color:#1f2937;
      ">
        <table
          width="100%"
          cellpadding="0"
          cellspacing="0"
          style="background:#f4f4f5;padding:32px 12px;"
        >
          <tr>
            <td align="center">

              <table
                width="100%"
                cellpadding="0"
                cellspacing="0"
                style="
                  max-width:620px;
                  background:#ffffff;
                  border-radius:12px;
                  overflow:hidden;
                  box-shadow:0 2px 12px rgba(0,0,0,.06);
                "
              >

                <tr>
                  <td style="
                    padding:28px 32px;
                    background:#83311b;
                    text-align:center;
                  ">
                    <div style="
                      color:#ffffff;
                      font-size:26px;
                      font-weight:700;
                      letter-spacing:.3px;
                    ">
                      🏡 Oni Homestay
                    </div>

                    <div style="
                      margin-top:6px;
                      color:#f5ddd3;
                      font-size:13px;
                    ">
                      Nghỉ ngơi như ở nhà
                    </div>
                  </td>
                </tr>

                <tr>
                  <td style="padding:32px;">

                    <div style="text-align:center;margin-bottom:24px;">
                      ${
                        input.badge
                          ? `
                            <span style="
                              display:inline-block;
                              padding:6px 12px;
                              background:${input.badgeColor ?? '#166534'}15;
                              color:${input.badgeColor ?? '#166534'};
                              border-radius:999px;
                              font-size:12px;
                              font-weight:700;
                              letter-spacing:.4px;
                            ">
                              ${escapeHtml(input.badge)}
                            </span>
                          `
                          : ''
                      }

                      <h1 style="
                        margin:14px 0 0;
                        font-size:24px;
                        line-height:1.3;
                        color:#1f2937;
                      ">
                        ${escapeHtml(input.title)}
                      </h1>
                    </div>

                    ${input.content}

                  </td>
                </tr>

                <tr>
                  <td style="
                    padding:24px 32px;
                    background:#fafafa;
                    border-top:1px solid #eeeeee;
                    text-align:center;
                  ">
                    <p style="
                      margin:0 0 8px;
                      font-size:13px;
                      color:#6b7280;
                    ">
                      Cảm ơn bạn đã tin tưởng Oni Homestay ❤️
                    </p>

                    <p style="
                      margin:0;
                      font-size:12px;
                      color:#9ca3af;
                      line-height:1.6;
                    ">
                      Email này được gửi tự động. Vui lòng không trả lời trực tiếp
                      email này.
                    </p>
                  </td>
                </tr>

              </table>

              <p style="
                margin:18px 0 0;
                font-size:11px;
                color:#9ca3af;
              ">
                © ${new Date().getFullYear()} Oni Homestay
              </p>

            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
