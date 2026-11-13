import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { SubmitVerificationDto, ReviewVerificationDto } from './dto/verification.dto';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class VerificationService {
  constructor(
    private prisma: PrismaService,
    private mailService: MailService,
    private notifications: NotificationsService,
  ) {}

  // ─── Submit verification evidence (by user) ──────────────────────────
  async submitVerification(userId: string, dto: SubmitVerificationDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found.');

    const submission = await this.prisma.verificationSubmission.create({
      data: {
        userId,
        evidenceUrl: dto.evidenceUrl,
        evidenceNotes: dto.evidenceNotes,
        evidenceDetails: dto.evidenceDetails || {},
        decision: 'pending',
      },
    });

    await this.prisma.user.update({
      where: { id: userId },
      data: { verificationStatus: 'pending' },
    });

    const admins = await this.prisma.user.findMany({
      where: { role: 'admin', status: 'active' },
      select: { id: true },
    });
    await Promise.all(admins.map((admin) => this.notifications.deliver(admin.id, {
      actorId: userId,
      category: 'system',
      type: 'verification_submitted',
      title: 'Verification submitted',
      message: `${user.email1} submitted verification evidence for review.`,
      link: `/admin/verification?submission=${submission.id}`,
      metadata: { submissionId: submission.id, userId },
      preference: 'verification',
      emailCategory: 'VERIFICATION',
    })));

    return {
      message: 'Verification submission received and is under review.',
      submission,
    };
  }

  // ─── Get user's current verification status ──────────────────────────
  async getStatus(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        verificationStatus: true,
        status: true,
        emailVerifiedAt: true,
      },
    });
    if (!user) throw new NotFoundException('User not found.');

    // Auto-heal account if status was erroneously set to pending_verification
    if (user.status === 'pending_verification') {
      await this.prisma.user.update({
        where: { id: userId },
        data: { status: 'active' },
      });
      user.status = 'active';
    }

    const latestSubmission = await this.prisma.verificationSubmission.findFirst({
      where: { userId },
      orderBy: { submittedAt: 'desc' },
      include: {
        reviewer: {
          select: {
            id: true,
            email1: true,
          },
        },
      },
    });

    return {
      user,
      latestSubmission,
    };
  }

  // ─── Admin: List submissions (filtered by status or all) ────────────
  async listQueue(status?: string) {
    const where: any = {};
    if (status && status !== 'all') {
      where.decision = status;
    } else if (!status) {
      where.decision = 'pending';
    }

    return this.prisma.verificationSubmission.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            email1: true,
            role: true,
            status: true,
            verificationStatus: true,
            artistProfile: {
              select: {
                workingName: true,
                fullName: true,
                websiteUrl: true,
                artistStatement: true,
                biography: true,
                city: true,
                country: true,
              },
            },
            galleryProfile: {
              select: {
                galleryName: true,
                directorName: true,
                directorEmail: true,
                websiteUrl: true,
                ethosStatement: true,
                mission: true,
              },
            },
            artProfessionalProfile: {
              select: {
                displayName: true,
                workingName: true,
                subType: true,
                websiteUrl: true,
                biography: true,
                organisation: true,
                jobTitle: true,
              },
            },
            collectorProfile: {
              select: {
                displayHandle: true,
                realName: true,
                city: true,
                country: true,
                websiteUrl: true,
                bio: true,
              },
            },
          },
        },
        reviewer: {
          select: {
            id: true,
            email1: true,
          },
        },
      },
      orderBy: { submittedAt: 'desc' },
    });
  }

  // ─── Admin: Get single submission detail ──────────────────────────────
  async getSubmission(submissionId: string) {
    const submission = await this.prisma.verificationSubmission.findUnique({
      where: { id: submissionId },
      include: {
        user: {
          include: {
            artistProfile: true,
            galleryProfile: true,
            artProfessionalProfile: true,
            collectorProfile: true,
          },
        },
        reviewer: {
          select: {
            id: true,
            email1: true,
          },
        },
      },
    });
    if (!submission) throw new NotFoundException('Verification submission not found.');
    return submission;
  }

  // ─── Admin: Review submission ─────────────────────────────────────────
  async reviewSubmission(
    adminId: string,
    submissionId: string,
    dto: ReviewVerificationDto,
  ) {
    const submission = await this.prisma.verificationSubmission.findUnique({
      where: { id: submissionId },
      include: {
        user: {
          select: {
            id: true,
            email1: true,
            role: true,
            artistProfile: { select: { fullName: true, workingName: true } },
            galleryProfile: { select: { galleryName: true, directorName: true } },
            artProfessionalProfile: { select: { displayName: true } },
            collectorProfile: { select: { realName: true } },
          },
        },
      },
    });
    if (!submission) throw new NotFoundException('Verification submission not found.');

    const updatedSubmission = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.verificationSubmission.update({
        where: { id: submissionId },
        data: {
          decision: dto.decision,
          reviewedBy: adminId,
          reviewedAt: new Date(),
          reviewerNotes: dto.reviewerNotes,
        },
      });

      // Verification is independent from account activation.
      await tx.user.update({
        where: { id: submission.userId },
        data: {
          verificationStatus: dto.decision,
          status: 'active',
        },
      });

      await tx.adminAction.create({
        data: {
          adminId,
          targetUserId: submission.userId,
          actionType: 'VERIFICATION_DECISION',
          notes: `Verification changed from ${submission.decision} to ${dto.decision}.${dto.reviewerNotes ? ` Reviewer notes: ${dto.reviewerNotes}` : ''}`,
        },
      });

      return updated;
    });

    const rolePrefix = submission.user.role === 'gallery' ? '/galleries'
      : submission.user.role === 'art_professional' ? '/art-professionals'
        : submission.user.role === 'collector' ? '/collectors'
          : '/artists';
    const isVerified = dto.decision === 'verified';
    await this.notifications.deliver(submission.userId, {
      actorId: adminId,
      category: 'system',
      type: 'verification_status_changed',
      title: isVerified ? 'Identity verification approved' : 'Verification update required',
      message: isVerified
        ? 'Your identity and professional credentials have been verified.'
        : `Your verification needs additional information. Feedback: ${dto.reviewerNotes || 'Please submit clearer documentation.'}`,
      link: `${rolePrefix}/verification${isVerified ? '' : '?resubmit=true'}`,
      metadata: { submissionId, decision: dto.decision },
      preference: 'verification',
      emailCategory: 'VERIFICATION',
    });

    return {
      message: `Submission marked as ${dto.decision}. User account remains active.`,
      submission: updatedSubmission,
    };
  }

  /**
   * Dispatches a verification support inquiry to the curation team and sends confirmation to user.
   */
  async sendSupportInquiry(userId: string, message: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email1: true,
        role: true,
        verificationStatus: true,
        artistProfile: { select: { fullName: true, workingName: true } },
        galleryProfile: { select: { galleryName: true, directorName: true } },
        artProfessionalProfile: { select: { displayName: true } },
        collectorProfile: { select: { realName: true } },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found.');
    }

    const senderName =
      user.artistProfile?.fullName ||
      user.artistProfile?.workingName ||
      user.galleryProfile?.directorName ||
      user.galleryProfile?.galleryName ||
      user.artProfessionalProfile?.displayName ||
      user.collectorProfile?.realName ||
      'Member';

    const adminEmail = process.env.ADMIN_EMAIL || process.env.SMTP_USER || 'admin@plinth.art';
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

    // 1. Notify Curation / Admin Team
    try {
      await this.mailService.sendNotificationEmail({
        to: adminEmail,
        recipientName: 'Curation Support Team',
        category: 'VERIFICATION',
        subject: `[Verification Support] Inquiry from ${senderName} (${user.role})`,
        headline: 'New Verification Support Request',
        message:
          `A member has submitted an inquiry regarding their verification process:\n\n` +
          `• Member: ${senderName}\n` +
          `• Account Email: ${user.email1}\n` +
          `• Role: ${user.role}\n` +
          `• Verification Status: ${user.verificationStatus}\n\n` +
          `Message Details:\n"${message}"`,
        ctaButton: {
          label: 'View Verification Queue',
          url: `${frontendUrl}/admin/verification`,
        },
      });
    } catch (err) {
      console.warn('Failed to send verification inquiry to admin:', err);
    }

    // 2. Send receipt acknowledgement to user
    try {
      await this.mailService.sendNotificationEmail({
        to: user.email1,
        recipientName: senderName,
        category: 'VERIFICATION',
        subject: 'We received your verification inquiry — Curato Matrix Support',
        headline: 'Your Inquiry Has Been Received',
        message:
          `Thank you for reaching out to the Curato Matrix curation team. We have received your inquiry regarding your verification credentials:\n\n` +
          `"${message}"\n\n` +
          `Our team is reviewing your account and will follow up with you directly via email shortly.`,
      });
    } catch (err) {
      console.warn('Failed to send verification inquiry confirmation to user:', err);
    }

    return {
      success: true,
      message: 'Your inquiry has been submitted to the curation team. Check your inbox for confirmation.',
    };
  }
}
