import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { NotificationCategory } from '../mail/mail.types';
import { Prisma } from '@prisma/client';

export type NotificationPreference = 'requests' | 'messages' | 'opportunities' | 'verification' | 'security' | 'governance';

export interface DeliverNotificationInput {
  actorId?: string;
  category: 'requests' | 'messages' | 'opportunities' | 'profile' | 'system';
  type: string;
  title: string;
  message: string;
  link?: string;
  metadata?: Record<string, unknown>;
  preference: NotificationPreference;
  emailCategory?: NotificationCategory;
  sendEmail?: boolean;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private readonly frontendUrl: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
    config: ConfigService,
  ) {
    this.frontendUrl = (config.get<string>('FRONTEND_URL') || 'http://localhost:3000').replace(/\/+$/, '');
  }

  async deliver(userId: string, input: DeliverNotificationInput) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { artistProfile: true, galleryProfile: true, artProfessionalProfile: true, collectorProfile: true },
    });
    if (!user) return null;

    const settings = (user.settings as Record<string, any> | null) || {};
    const preferences = (settings.notifications as Record<string, boolean> | undefined) || {};
    const inAppEnabled = preferences.inAppPush !== false;
    const emailEnabled = this.emailEnabled(input.preference, input.type, preferences);

    let notification = null;
    if (inAppEnabled) {
      try {
        notification = await this.prisma.notification.create({
          data: {
            userId,
            actorId: input.actorId,
            category: input.category,
            type: input.type,
            title: input.title,
            message: input.message,
            link: input.link,
            metadata: (input.metadata || {}) as Prisma.InputJsonValue,
          },
        });
      } catch (error) {
        this.logger.error(`Could not persist notification for user ${userId}.`, error instanceof Error ? error.stack : undefined);
      }
    }

    if (input.sendEmail !== false && emailEnabled && user.email1) {
      const result = await this.mail.sendNotificationEmail({
        to: user.email1,
        recipientName: this.displayName(user),
        category: input.emailCategory || 'SYSTEM',
        subject: input.title,
        headline: input.title,
        message: input.message,
        ctaButton: input.link
          ? { label: 'View in THE PLINTH IQ', url: `${this.frontendUrl}${input.link}` }
          : undefined,
      });
      if (result.success && notification) {
        await this.prisma.notification.update({ where: { id: notification.id }, data: { emailSentAt: new Date() } })
          .catch((error) => this.logger.warn(`Email sent but delivery timestamp could not be saved: ${error.message}`));
      }
    }

    return notification;
  }

  async list(userId: string) {
    return this.prisma.notification.findMany({
      where: { userId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async unreadCount(userId: string) {
    return { count: await this.prisma.notification.count({ where: { userId, readAt: null, deletedAt: null } }) };
  }

  async markRead(userId: string, id: string) {
    const result = await this.prisma.notification.updateMany({ where: { id, userId, deletedAt: null }, data: { readAt: new Date() } });
    if (!result.count) throw new NotFoundException('Notification not found.');
    return { message: 'Notification marked as read.' };
  }

  async markAllRead(userId: string) {
    await this.prisma.notification.updateMany({ where: { userId, readAt: null, deletedAt: null }, data: { readAt: new Date() } });
    return { message: 'All notifications marked as read.' };
  }

  async remove(userId: string, id: string) {
    const result = await this.prisma.notification.updateMany({ where: { id, userId, deletedAt: null }, data: { deletedAt: new Date() } });
    if (!result.count) throw new NotFoundException('Notification not found.');
    return { message: 'Notification removed.' };
  }

  private emailEnabled(preference: NotificationPreference, type: string, settings: Record<string, boolean>) {
    if (preference === 'messages') return settings.emailMessages !== false;
    if (preference === 'opportunities') return (settings.emailOpportunities ?? settings.notifyBriefs) !== false;
    if (preference === 'verification') return settings.verificationAlerts !== false;
    if (preference === 'security') return settings.securityAlerts !== false;
    if (preference === 'governance') return settings.governanceAlerts !== false;
    if (type.includes('pvr')) return (settings.emailRequests ?? settings.notifyPVR) !== false;
    if (type.includes('visit')) return (settings.emailRequests ?? settings.notifyVisits) !== false;
    return settings.emailRequests !== false;
  }

  private displayName(user: any) {
    return user.artistProfile?.workingName || user.artistProfile?.fullName || user.galleryProfile?.galleryName ||
      user.artProfessionalProfile?.displayName || user.collectorProfile?.realName || user.collectorProfile?.displayHandle ||
      user.email1.split('@')[0];
  }
}
