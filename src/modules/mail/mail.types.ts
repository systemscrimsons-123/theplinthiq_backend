import { Readable } from 'stream';

export interface MailAttachment {
  filename: string;
  content?: string | Buffer | Readable;
  path?: string;
  contentType?: string;
  cid?: string;
  encoding?: string;
}

export interface SendMailOptions {
  to: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
  subject: string;
  text?: string;
  html?: string;
  replyTo?: string;
  attachments?: MailAttachment[];
  headers?: Record<string, string>;
}

export type NotificationCategory =
  | 'AUTH'
  | 'ONBOARDING'
  | 'VERIFICATION'
  | 'PITCH_SUBMISSION'
  | 'PITCH_STATUS_UPDATE'
  | 'PVR_REQUEST'
  | 'PVR_STATUS_UPDATE'
  | 'PRIVATE_VIEWING'
  | 'BRIEF_OPPORTUNITY'
  | 'DIRECT_INQUIRY'
  | 'CONTACT_REVEAL'
  | 'CONVERSATION_MESSAGE'
  | 'SYSTEM';

export interface NotificationEmailPayload {
  to: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
  recipientName?: string;
  category: NotificationCategory;
  subject: string;
  headline: string;
  message: string;
  details?: Array<{ label: string; value: string }>;
  ctaButton?: {
    label: string;
    url: string;
  };
  attachments?: MailAttachment[];
}

