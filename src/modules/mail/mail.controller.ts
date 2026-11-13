import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { MailService } from './mail.service';
import { SendCustomMailDto, TestMailDto } from './dto/send-mail.dto';

@Controller('mail')
export class MailController {
  constructor(private readonly mailService: MailService) {}

  /**
   * Universal endpoint for sending emails with CC, BCC, Attachments, HTML, and Text.
   */
  @Post('send')
  @HttpCode(HttpStatus.OK)
  async sendCustomMail(@Body() dto: SendCustomMailDto) {
    const res = await this.mailService.sendMail({
      to: dto.to,
      cc: dto.cc,
      bcc: dto.bcc,
      subject: dto.subject,
      text: dto.text,
      html: dto.html,
      attachments: dto.attachments?.map((att) => ({
        filename: att.filename,
        content: att.content,
        path: att.path,
        contentType: att.contentType,
        cid: att.cid,
      })),
    });

    return {
      message: res.success
        ? 'Email dispatched successfully via SMTP.'
        : 'Failed to deliver email.',
      ...res,
    };
  }

  /**
   * Helper endpoint to send a test THE PLINTH IQ branded email
   */
  @Post('test')
  @HttpCode(HttpStatus.OK)
  async sendTestMail(@Body() dto: TestMailDto) {
    const res = await this.mailService.sendNotificationEmail({
      to: dto.to,
      category: 'SYSTEM',
      subject: 'THE PLINTH IQ SMTP System Verification',
      headline: 'SMTP Email Delivery Test',
      message:
        'This is a confirmation test sent from the PLINTH IQ backend mail service using HawkHost SMTP (lax028.hawkhost.com:587). Full support for CC, BCC, HTML templates, and file attachments is active.',
      details: [
        { label: 'SMTP Host', value: 'lax028.hawkhost.com:587' },
        { label: 'Sender', value: 'info@demotempwebsite.co.in' },
        { label: 'Timestamp', value: new Date().toISOString() },
        { label: 'Encryption', value: 'STARTTLS (TLSv1.2/1.3)' },
      ],
      ctaButton: {
        label: 'Open THE PLINTH IQ Platform',
        url: 'http://localhost:3000',
      },
    });

    return {
      message: res.success ? 'Test email sent successfully.' : 'Failed to send test email.',
      ...res,
    };
  }
}

