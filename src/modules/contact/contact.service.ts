import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ContactService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Helper to mask email address: e.g. j***e@domain.com
   */
  private maskEmail(email?: string | null): string | null {
    if (!email) return null;
    const parts = email.split('@');
    if (parts.length !== 2) return '***';
    const name = parts[0];
    const domain = parts[1];
    if (name.length <= 2) {
      return `${name[0]}***@${domain}`;
    }
    return `${name[0]}***${name[name.length - 1]}@${domain}`;
  }

  /**
   * Helper to mask phone number: e.g. +91 98*** ***10
   */
  private maskPhone(phone?: string | null): string | null {
    if (!phone) return null;
    const clean = phone.trim();
    if (clean.length <= 4) return '***';
    const start = clean.slice(0, 3);
    const end = clean.slice(-2);
    return `${start}******${end}`;
  }

  /**
   * Get user contact information (masked by default, unmasked if authorized or revealed)
   */
  async getUserContact(viewerId: string, targetUserId: string) {
    const targetUser = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      select: {
        id: true,
        email1: true,
        email2: true,
        phone1: true,
        phone2: true,
        role: true,
      },
    });

    if (!targetUser) {
      throw new NotFoundException('User not found.');
    }

    // 1. If viewer is target user or admin, return unmasked
    if (viewerId === targetUserId) {
      return {
        userId: targetUser.id,
        isMasked: false,
        email1: targetUser.email1,
        email2: targetUser.email2,
        phone1: targetUser.phone1,
        phone2: targetUser.phone2,
      };
    }

    const viewer = await this.prisma.user.findUnique({ where: { id: viewerId } });
    if (viewer?.role === 'admin') {
      return {
        userId: targetUser.id,
        isMasked: false,
        email1: targetUser.email1,
        email2: targetUser.email2,
        phone1: targetUser.phone1,
        phone2: targetUser.phone2,
      };
    }

    // 2. Check if contact has been explicitly revealed
    const reveal = await this.prisma.contactReveal.findFirst({
      where: {
        revealerId: viewerId,
        targetId: targetUserId,
      },
    });

    if (reveal) {
      return {
        userId: targetUser.id,
        isMasked: false,
        email1: targetUser.email1,
        email2: targetUser.email2,
        phone1: targetUser.phone1,
        phone2: targetUser.phone2,
      };
    }

    // 3. Check if there is an accepted interaction between them
    const acceptedRequest = await this.prisma.request.findFirst({
      where: {
        status: 'accepted',
        OR: [
          { requesterId: viewerId, recipientId: targetUserId },
          { requesterId: targetUserId, recipientId: viewerId },
        ],
      },
    });

    if (acceptedRequest) {
      return {
        userId: targetUser.id,
        isMasked: false,
        email1: targetUser.email1,
        email2: targetUser.email2,
        phone1: targetUser.phone1,
        phone2: targetUser.phone2,
      };
    }

    // 4. Return masked
    return {
      userId: targetUser.id,
      isMasked: true,
      email1: this.maskEmail(targetUser.email1),
      email2: this.maskEmail(targetUser.email2),
      phone1: this.maskPhone(targetUser.phone1),
      phone2: this.maskPhone(targetUser.phone2),
    };
  }

  /**
   * Explicitly reveal contact details (records audit log into contact_reveals)
   */
  async revealUserContact(viewerId: string, targetUserId: string) {
    const targetUser = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      select: {
        id: true,
        email1: true,
        email2: true,
        phone1: true,
        phone2: true,
        role: true,
      },
    });

    if (!targetUser) {
      throw new NotFoundException('User not found.');
    }

    if (viewerId === targetUserId) {
      return {
        userId: targetUser.id,
        isMasked: false,
        email1: targetUser.email1,
        email2: targetUser.email2,
        phone1: targetUser.phone1,
        phone2: targetUser.phone2,
      };
    }

    if (targetUser.role === 'collector') {
      const acceptedInteraction = await this.prisma.request.findFirst({
        where: {
          status: 'accepted',
          requesterId: targetUserId,
          recipientId: viewerId,
        },
      });

      if (!acceptedInteraction) {
        throw new ForbiddenException(
          'Collector contact details remain private until the collector initiates an interaction and it is accepted.',
        );
      }
    }

    await this.prisma.contactReveal.upsert({
      where: {
        revealerId_targetId: {
          revealerId: viewerId,
          targetId: targetUserId,
        },
      },
      create: {
        revealerId: viewerId,
        targetId: targetUserId,
      },
      update: {
        revealedAt: new Date(),
      },
    });

    return {
      userId: targetUser.id,
      isMasked: false,
      email1: targetUser.email1,
      email2: targetUser.email2,
      phone1: targetUser.phone1,
      phone2: targetUser.phone2,
      message: 'Contact revealed and audited.',
    };
  }
}
