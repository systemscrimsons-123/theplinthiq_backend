import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SendMessageDto } from './dto/thread.dto';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class ThreadsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  private formatUser(user: any) {
    if (!user) return null;
    let name = user.email1.split('@')[0];
    let photoUrl: string | null = null;
    let subInfo: string | null = null;

    if (user.artistProfile) {
      name = user.artistProfile.workingName || user.artistProfile.fullName || name;
      photoUrl = user.artistProfile.photoUrl;
      subInfo = user.artistProfile.careerStage;
    } else if (user.galleryProfile) {
      name = user.galleryProfile.galleryName || name;
      photoUrl = user.galleryProfile.logoUrl;
      subInfo = user.galleryProfile.spaceType;
    } else if (user.artProfessionalProfile) {
      name = user.artProfessionalProfile.displayName || name;
      photoUrl = user.artProfessionalProfile.photoUrl;
      subInfo = user.artProfessionalProfile.subType;
    } else if (user.collectorProfile) {
      name = user.collectorProfile.displayHandle || 'Collector';
      subInfo = user.collectorProfile.city;
    }

    return {
      id: user.id,
      role: user.role,
      name,
      photoUrl,
      subInfo,
    };
  }

  /**
   * List all threads the user participates in
   */
  async getUserThreads(userId: string) {
    const participants = await this.prisma.threadParticipant.findMany({
      where: { userId },
      select: { threadId: true },
    });

    const threadIds = participants.map((p) => p.threadId);

    if (threadIds.length === 0) {
      return [];
    }

    const threads = await this.prisma.thread.findMany({
      where: { id: { in: threadIds } },
      include: {
        participants: {
          include: {
            user: {
              include: {
                artistProfile: true,
                galleryProfile: true,
                artProfessionalProfile: true,
                collectorProfile: true,
              },
            },
          },
        },
        messages: {
          take: 1,
          orderBy: { sentAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return threads.map((t) => {
      const latestMessage = t.messages[0] || null;
      const otherParticipants = t.participants
        .filter((p) => p.userId !== userId)
        .map((p) => this.formatUser(p.user));

      return {
        id: t.id,
        originatingRequestId: t.originatingRequestId,
        createdAt: t.createdAt,
        counterparties: otherParticipants,
        latestMessage: latestMessage
          ? {
              id: latestMessage.id,
              senderId: latestMessage.senderId,
              body: latestMessage.body,
              sentAt: latestMessage.sentAt,
            }
          : null,
      };
    });
  }

  /**
   * Get thread messages
   */
  async getThread(userId: string, threadId: string) {
    const participant = await this.prisma.threadParticipant.findUnique({
      where: {
        threadId_userId: {
          threadId,
          userId,
        },
      },
    });

    if (!participant) {
      throw new ForbiddenException('You are not a participant in this conversation thread.');
    }

    const thread = await this.prisma.thread.findUnique({
      where: { id: threadId },
      include: {
        participants: {
          include: {
            user: {
              include: {
                artistProfile: true,
                galleryProfile: true,
                artProfessionalProfile: true,
                collectorProfile: true,
              },
            },
          },
        },
        messages: {
          orderBy: { sentAt: 'asc' },
          include: {
            sender: {
              include: {
                artistProfile: true,
                galleryProfile: true,
                artProfessionalProfile: true,
                collectorProfile: true,
              },
            },
          },
        },
      },
    });

    if (!thread) {
      throw new NotFoundException('Thread not found.');
    }

    return {
      id: thread.id,
      originatingRequestId: thread.originatingRequestId,
      createdAt: thread.createdAt,
      participants: thread.participants.map((p) => this.formatUser(p.user)),
      messages: thread.messages.map((m) => ({
        id: m.id,
        senderId: m.senderId,
        sender: this.formatUser(m.sender),
        body: m.body,
        sentAt: m.sentAt,
      })),
    };
  }

  /**
   * Post message to thread
   */
  async sendMessage(userId: string, threadId: string, dto: SendMessageDto) {
    const participant = await this.prisma.threadParticipant.findUnique({
      where: {
        threadId_userId: {
          threadId,
          userId,
        },
      },
    });

    if (!participant) {
      throw new ForbiddenException('You are not a participant in this conversation thread.');
    }

    const message = await this.prisma.threadMessage.create({
      data: {
        threadId,
        senderId: userId,
        body: dto.body,
      },
      include: {
        sender: {
          include: {
            artistProfile: true,
            galleryProfile: true,
            artProfessionalProfile: true,
            collectorProfile: true,
          },
        },
      },
    });

    const recipients = await this.prisma.threadParticipant.findMany({
      where: { threadId, userId: { not: userId } },
      include: { user: { select: { role: true } } },
    });
    const senderName = this.formatUser(message.sender)?.name || 'A member';
    await Promise.all(recipients.map((recipient) => this.notifications.deliver(recipient.userId, {
      actorId: userId,
      category: 'messages',
      type: 'message_received',
      title: `New message from ${senderName}`,
      message: dto.body.length > 180 ? `${dto.body.slice(0, 177)}...` : dto.body,
      link: `${this.rolePrefix(recipient.user.role)}/conversations?thread=${threadId}`,
      metadata: { threadId, messageId: message.id },
      preference: 'messages',
      emailCategory: 'CONVERSATION_MESSAGE',
    })));

    return message;
  }

  private rolePrefix(role: string) {
    if (role === 'gallery') return '/galleries';
    if (role === 'art_professional') return '/art-professionals';
    if (role === 'collector') return '/collectors';
    if (role === 'admin') return '/admin';
    return '/artists';
  }
}
