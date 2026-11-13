import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import {
  SendMailOptions,
  NotificationEmailPayload,
  NotificationCategory,
} from './mail.types';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: Transporter;
  private readonly fromAddress: string;
  private readonly frontendUrl: string;

  constructor(private readonly config: ConfigService) {
    const host = this.config.get<string>('SMTP_HOST', 'lax028.hawkhost.com');
    const port = Number(this.config.get<number>('SMTP_PORT', 587));
    const user = this.config.get<string>('SMTP_USER', 'info@demotempwebsite.co.in');
    const pass = this.config.get<string>('SMTP_PASS', 'bP@$Eb}yuCxtKG.V');
    this.fromAddress =
      this.config.get<string>('SMTP_FROM', 'THE PLINTH IQ <info@demotempwebsite.co.in>');
    
    const isProd = this.config.get<string>('NODE_ENV') === 'production';
    const defaultFrontendUrl = isProd
      ? 'https://plinth.demotempwebsite.co.in'
      : 'http://localhost:3000';
    this.frontendUrl = (
      this.config.get<string>('FRONTEND_URL') || defaultFrontendUrl
    ).replace(/\/+$/, '');

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: {
        user,
        pass,
      },
      tls: {
        rejectUnauthorized: false,
      },
    });

    this.logger.log(`MailService initialized with SMTP host: ${host}:${port} (${user})`);
  }

  /**
   * Generic sender accepting To, CC, BCC, Attachments, HTML and plain text
   */
  async sendMail(options: SendMailOptions): Promise<{
    success: boolean;
    messageId?: string;
    accepted?: string[];
    rejected?: string[];
    error?: string;
  }> {
    try {
      const mailOptions: nodemailer.SendMailOptions = {
        from: this.fromAddress,
        to: options.to,
        cc: options.cc,
        bcc: options.bcc,
        subject: options.subject,
        text: options.text,
        html: options.html,
        replyTo: options.replyTo || this.fromAddress,
        attachments: options.attachments?.map((att) => ({
          filename: att.filename,
          content: att.content,
          path: att.path,
          contentType: att.contentType,
          cid: att.cid,
          encoding: att.encoding,
        })),
        headers: options.headers,
      };

      const info = await this.transporter.sendMail(mailOptions);
      this.logger.log(`Email dispatched successfully to [${options.to}]. MessageId: ${info.messageId}`);
      return {
        success: true,
        messageId: info.messageId,
        accepted: (info.accepted as string[]) || [],
        rejected: (info.rejected as string[]) || [],
      };
    } catch (err: any) {
      this.logger.error(`Failed to send email to [${options.to}]: ${err.message}`, err.stack);
      return {
        success: false,
        error: err.message,
      };
    }
  }

  // ─── Branded Template Wrapper ───────────────────────────────────────
  private wrapInPlinthTemplate(params: {
    preheader?: string;
    headline: string;
    categoryBadge?: string;
    greeting?: string;
    introHtml: string;
    ctaButton?: { label: string; url: string };
    details?: { label: string; value: string }[];
    fallbackUrl?: string;
    outroHtml?: string;
  }): string {
    const {
      preheader,
      headline,
      categoryBadge,
      greeting,
      introHtml,
      ctaButton,
      details,
      fallbackUrl,
      outroHtml,
    } = params;
    const year = new Date().getFullYear();

    const ctaButtonHtml = ctaButton
      ? `
      <table cellpadding="0" cellspacing="0" border="0" style="margin: 26px 0 22px 0;">
        <tr>
          <td align="center" style="background-color: #5A202B; border-radius: 2px;">
            <a href="${ctaButton.url}" target="_blank" style="display: inline-block; background-color: #5A202B; color: #FFFFFF !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 12.5px; font-weight: 600; letter-spacing: 0.14em; text-transform: uppercase; padding: 14px 32px; text-decoration: none; border-radius: 2px;">
              ${ctaButton.label} &rarr;
            </a>
          </td>
        </tr>
      </table>`
      : '';

    const detailsBoxHtml =
      details && details.length > 0
        ? `
      <div style="background-color: #FAF9F6; border: 1px solid #ECE7DE; border-radius: 3px; padding: 14px 18px; margin: 22px 0 12px 0; box-sizing: border-box; width: 100%;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="width: 100%; table-layout: fixed; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13px;">
          ${details
            .map(
              (d, idx) => `
            <tr>
              <td style="color: #7D776F; padding: 6px 0; font-weight: 500; width: 42%; vertical-align: top; word-break: break-word; ${
                idx < details.length - 1 ? 'border-bottom: 1px solid #F0ECE4;' : ''
              }">${d.label}</td>
              <td style="color: #151515; font-weight: 600; text-align: right; padding: 6px 0; width: 58%; vertical-align: top; word-break: break-all; overflow-wrap: anywhere; ${
                idx < details.length - 1 ? 'border-bottom: 1px solid #F0ECE4;' : ''
              }">${d.value}</td>
            </tr>`,
            )
            .join('')}
        </table>
      </div>`
        : '';

    const effectiveFallbackUrl = fallbackUrl || ctaButton?.url;
    const fallbackBoxHtml = effectiveFallbackUrl
      ? `
      <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #ECE7DE; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 11.5px; color: #7D776F; line-height: 1.6; width: 100%; box-sizing: border-box;">
        If the button above does not work, copy and paste this link into your browser:
        <div style="margin-top: 8px; word-break: break-all; word-wrap: break-word; overflow-wrap: anywhere; color: #5A202B; font-family: ui-monospace, Menlo, Monaco, Consolas, monospace; font-size: 11px; background: #FAF9F6; border: 1px solid #E5DFD5; padding: 10px 12px; border-radius: 2px; max-width: 100%; box-sizing: border-box; overflow: hidden; line-height: 1.5;">
          <a href="${effectiveFallbackUrl}" style="color: #5A202B; text-decoration: underline; word-break: break-all; word-wrap: break-word; overflow-wrap: anywhere;">${effectiveFallbackUrl}</a>
        </div>
      </div>`
      : '';

    return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${headline}</title>
  <style type="text/css">
    * { box-sizing: border-box !important; }
    html, body { margin: 0 !important; padding: 0 !important; width: 100% !important; min-width: 100% !important; background-color: #F6F4EE !important; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { border-collapse: separate; mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; -ms-interpolation-mode: bicubic; }
    @media only screen and (max-width: 600px) {
      .email-container { width: 100% !important; max-width: 100% !important; border-radius: 0 !important; }
      .email-cell-pad { padding-left: 18px !important; padding-right: 18px !important; }
      .email-body-pad { padding: 26px 18px 22px 18px !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #F6F4EE; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #151515; -webkit-font-smoothing: antialiased;">
  ${preheader ? `<div style="display:none;font-size:1px;color:#F6F4EE;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">${preheader}</div>` : ''}
  
  <!-- Outer Table Wrapper (Centers email without overflowing 100vw) -->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width: 100% !important; min-width: 100% !important; margin: 0; padding: 0; background-color: #F6F4EE; table-layout: fixed;">
    <tr>
      <td align="center" style="padding: 28px 12px; background-color: #F6F4EE; vertical-align: top;">
        
        <!-- Main Card Container -->
        <table role="presentation" class="email-container" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 580px; width: 100%; margin: 0 auto; background-color: #FFFFFF; border: 1px solid #E5E0D8; border-radius: 4px; table-layout: fixed; overflow: hidden; box-shadow: 0 4px 18px rgba(0,0,0,0.03);">
          
          <!-- Header Row -->
          <tr>
            <td class="email-cell-pad" style="padding: 22px 28px 18px 28px; background-color: #FAF8F5; border-bottom: 1px solid #EBE7E0;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="width: 100%; table-layout: fixed;">
                <tr>
                  <td align="left" valign="middle">
                    <div style="font-family: Georgia, 'Times New Roman', serif; font-size: 22px; font-weight: bold; letter-spacing: 0.14em; color: #151515; line-height: 1;">THE PLINTH IQ</div>
                    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 8.5px; font-weight: 600; letter-spacing: 0.20em; color: #77736C; text-transform: uppercase; margin-top: 5px;">CONTEMPORARY ART &middot; CURATORIAL DISCOVERY</div>
                  </td>
                  ${
                    categoryBadge
                      ? `<td align="right" valign="middle" style="width: 120px;">
                           <table cellpadding="0" cellspacing="0" border="0" align="right">
                             <tr>
                               <td style="background-color: #FAF4F5; border: 1px solid #EBD5D8; padding: 4px 10px; border-radius: 12px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 9px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: #5A202B; text-align: center; white-space: nowrap;">
                                 ${categoryBadge}
                               </td>
                             </tr>
                           </table>
                         </td>`
                      : ''
                  }
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body Row -->
          <tr>
            <td class="email-body-pad" style="padding: 34px 28px 30px 28px; word-break: break-word; overflow-wrap: break-word;">
              <h1 style="font-family: Georgia, 'Times New Roman', serif; font-size: 25px; line-height: 1.3; color: #151515; margin: 0 0 20px 0; font-weight: normal;">
                ${headline}
              </h1>
              <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; line-height: 1.7; color: #3A3632;">
                ${greeting ? `<p style="font-size: 14px; line-height: 1.7; color: #3A3632; margin: 0 0 14px 0;">${greeting}</p>` : ''}
                ${introHtml}
              </div>
              ${ctaButtonHtml}
              ${detailsBoxHtml}
              ${fallbackBoxHtml}
              ${
                outroHtml
                  ? `<div style="margin-top: 18px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13.5px; line-height: 1.6; color: #66625C;">${outroHtml}</div>`
                  : ''
              }
            </td>
          </tr>

          <!-- Footer Row -->
          <tr>
            <td class="email-cell-pad" style="padding: 22px 24px; background-color: #FAF8F5; border-top: 1px solid #EBE7E0; text-align: center; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 11px; line-height: 1.6; color: #77736C;">
              <div style="font-weight: 600; color: #151515; letter-spacing: 0.05em; font-size: 11.5px;">THE PLINTH IQ &middot; Contemporary Art Intelligence &amp; Discovery</div>
              <div style="margin-top: 4px;">&copy; ${year} THE PLINTH IQ Platform. All rights reserved.</div>
              <div style="margin-top: 8px;">
                <a href="${this.frontendUrl}" style="color: #5A202B; text-decoration: underline;">Visit THE PLINTH IQ</a> &nbsp;&middot;&nbsp; 
                <a href="${this.frontendUrl}/terms" style="color: #5A202B; text-decoration: underline;">Terms of Service</a> &nbsp;&middot;&nbsp; 
                <a href="${this.frontendUrl}/privacy" style="color: #5A202B; text-decoration: underline;">Privacy Policy</a>
              </div>
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>
</body>
</html>`;
  }

  // ─── Verification Email ─────────────────────────────────────────────
  async sendVerificationEmail(
    to: string,
    fullName: string,
    verifyToken: string,
  ) {
    const verifyUrl = `${this.frontendUrl}/verify-email?token=${verifyToken}`;
    const html = this.wrapInPlinthTemplate({
      preheader: 'Please confirm your email address to activate your THE PLINTH IQ account.',
      headline: 'Verify your email address',
      categoryBadge: 'Verification',
      greeting: `Hello ${fullName || 'there'},`,
      introHtml: `
        <p class="paragraph" style="font-size: 14.5px; line-height: 1.7; color: #3A3632; margin: 0 0 16px 0;">
          Thank you for joining <strong>THE PLINTH IQ</strong>. Please confirm that <strong>${to}</strong> belongs to you to activate your account and gain access to curated artist rosters, private viewing rooms, and exhibition briefs.
        </p>
        <p class="paragraph" style="font-size: 14.5px; line-height: 1.7; color: #3A3632; margin: 0 0 8px 0;">
          Click the button below to verify your email address. This link is valid for <strong>24 hours</strong>.
        </p>
      `,
      ctaButton: {
        label: 'Verify My Email',
        url: verifyUrl,
      },
      details: [
        { label: 'Registered Email', value: to },
        { label: 'Security Validity', value: '24 Hours' },
      ],
      fallbackUrl: verifyUrl,
    });

    return this.sendMail({
      to,
      subject: 'Verify your email address — THE PLINTH IQ',
      text: `Hello ${fullName},\n\nPlease verify your THE PLINTH IQ account using the link below:\n${verifyUrl}\n\nThis link expires in 24 hours.`,
      html,
    });
  }

  // ─── Password Reset Email ───────────────────────────────────────────
  async sendPasswordResetEmail(
    to: string,
    fullName: string,
    resetToken: string,
  ) {
    const resetUrl = `${this.frontendUrl}/reset-password?token=${resetToken}`;
    const html = this.wrapInPlinthTemplate({
      preheader: 'Reset your THE PLINTH IQ account password.',
      headline: 'Reset your password',
      categoryBadge: 'Security',
      greeting: `Hello ${fullName || 'there'},`,
      introHtml: `
        <p class="paragraph" style="font-size: 14.5px; line-height: 1.7; color: #3A3632; margin: 0 0 16px 0;">
          We received a request to reset the password associated with your THE PLINTH IQ account. Click the button below to choose a new password.
        </p>
        <p class="paragraph" style="font-size: 14.5px; line-height: 1.7; color: #3A3632; margin: 0 0 8px 0;">
          If you did not request a password reset, you can safely disregard this email; your credentials remain secure.
        </p>
      `,
      ctaButton: {
        label: 'Reset Password',
        url: resetUrl,
      },
      details: [
        { label: 'Account Email', value: to },
        { label: 'Link Expiration', value: '1 Hour' },
      ],
      fallbackUrl: resetUrl,
    });

    return this.sendMail({
      to,
      subject: 'Reset your THE PLINTH IQ password',
      text: `Hello ${fullName},\n\nClick the link below to reset your password:\n${resetUrl}\n\nIf you did not make this request, please ignore this email.`,
      html,
    });
  }

  // ─── Onboarding Completed Confirmation ──────────────────────────────
  async sendOnboardingCompletedEmail(
    to: string,
    fullName: string,
    role: string,
  ) {
    const roleLabels: Record<string, { title: string; route: string; label: string }> = {
      artist: { title: 'Artist Profile Live', route: '/artists/edit-profile', label: 'Artist' },
      gallery: { title: 'Gallery Roster Live', route: '/galleries/edit-profile', label: 'Gallery' },
      art_professional: { title: 'Curatorial Practice Connected', route: '/art-professionals/edit-profile', label: 'Art Professional' },
      collector: { title: 'Collector Account Activated', route: '/collectors/discover', label: 'Collector' },
    };

    const config = roleLabels[role] || { title: 'Profile Setup Complete', route: '/login', label: role.toUpperCase() };
    const destinationUrl = `${this.frontendUrl}${config.route}`;

    const html = this.wrapInPlinthTemplate({
      preheader: 'Your THE PLINTH IQ onboarding setup is complete.',
      headline: 'Welcome to THE PLINTH IQ',
      categoryBadge: 'Onboarding',
      greeting: `Hello ${fullName || 'there'},`,
      introHtml: `
        <p class="paragraph" style="font-size: 14.5px; line-height: 1.7; color: #3A3632; margin: 0 0 16px 0;">
          Congratulations! Your profile setup as a <strong>${config.label}</strong> has been saved and your onboarding is now complete.
        </p>
        <p class="paragraph" style="font-size: 14.5px; line-height: 1.7; color: #3A3632; margin: 0 0 8px 0;">
          You can now explore the curated discovery network, build and showcase private viewing rooms, respond to curatorial open calls, and connect with institutions globally.
        </p>
      `,
      ctaButton: {
        label: 'Open Your Dashboard',
        url: destinationUrl,
      },
      details: [
        { label: 'Role Profile', value: config.label },
        { label: 'Account Status', value: 'Active & Verified' },
      ],
      fallbackUrl: destinationUrl,
    });

    return this.sendMail({
      to,
      subject: `Welcome to THE PLINTH IQ — ${config.title}`,
      text: `Hello ${fullName},\n\nYour THE PLINTH IQ onboarding setup is complete! Access your dashboard here:\n${destinationUrl}`,
      html,
    });
  }

  // ─── Universal Notification Email Handler ───────────────────────────
  async sendNotificationEmail(payload: NotificationEmailPayload) {
    const safeMessage = this.escapeHtml(payload.message).replace(/\n/g, '<br>');
    const html = this.wrapInPlinthTemplate({
      preheader: this.escapeHtml(payload.message),
      headline: this.escapeHtml(payload.headline),
      categoryBadge: this.escapeHtml(payload.category.replace(/_/g, ' ')),
      greeting: payload.recipientName ? `Dear ${this.escapeHtml(payload.recipientName)},` : undefined,
      introHtml: `
        <p class="paragraph" style="font-size: 14.5px; line-height: 1.7; color: #3A3632; margin: 0 0 16px 0;">
          ${safeMessage}
        </p>
      `,
      ctaButton: payload.ctaButton,
      details: payload.details,
      fallbackUrl: payload.ctaButton?.url,
    });

    return this.sendMail({
      to: payload.to,
      cc: payload.cc,
      bcc: payload.bcc,
      subject: payload.subject,
      text: `${payload.headline}\n\n${payload.message}${
        payload.ctaButton ? `\n\nLink: ${payload.ctaButton.url}` : ''
      }`,
      html,
      attachments: payload.attachments,
    });
  }

  private escapeHtml(value: string) {
    return value.replace(/[&<>"']/g, (character) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    })[character] || character);
  }
}
