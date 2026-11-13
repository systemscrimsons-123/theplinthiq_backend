import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateRequestDto,
  RespondRequestDto,
  ScheduleVisitDto,
  SharePvrDocumentDto,
  WithdrawRequestDto,
} from './dto/request.dto';
import { UserRole, RequestType, RequestStatus } from '@prisma/client';
import { getInteractionPolicy } from '../../common/policies/interaction-policy';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class RequestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  /**
    * Enforces platform interaction rules between roles
   */
  private async validateInteractionRules(
    fromRole: UserRole,
    toRole: UserRole,
    requestType: RequestType,
  ) {
    // Admin has no restrictions
    if (fromRole === 'admin') return;

    const policy = getInteractionPolicy(fromRole, toRole);
    if (policy) {
      if (policy.mode === 'blocked') {
        throw new ForbiddenException(
          `Direct outreach from ${fromRole.replace('_', ' ')} to ${toRole.replace('_', ' ')} is restricted by platform policy.`,
        );
      }
      if (policy.mode === 'pitch_only') {
        throw new ForbiddenException(
          `${fromRole.replace('_', ' ')} cannot send direct requests to ${toRole.replace('_', ' ')}. You may only apply to a published open call or brief via a pitch.`,
        );
      }
      if (!policy.allowedRequestTypes.includes(requestType)) {
        throw new ForbiddenException(
          `${fromRole.replace('_', ' ')} cannot send a ${requestType} request to ${toRole.replace('_', ' ')} under the platform interaction rules.`,
        );
      }
      return;
    }

    if (toRole === 'admin') {
      throw new ForbiddenException('Platform administrators cannot receive member interaction requests.');
    }

    // Fallback for any future role relationship not yet covered by policy.
    const rule = await this.prisma.interactionPermission.findUnique({
      where: {
        fromRole_toRole: { fromRole, toRole },
      },
    });

    if (rule?.mode === 'blocked') {
      throw new ForbiddenException(
        `Direct outreach from ${fromRole.replace('_', ' ')} to ${toRole.replace('_', ' ')} is restricted by platform policy.`,
      );
    }
    if (rule?.mode === 'pitch_only') {
      throw new ForbiddenException(
        `${fromRole.replace('_', ' ')} cannot send direct requests to ${toRole.replace('_', ' ')}. You may only apply to a published open call or brief via a pitch.`,
      );
    }
  }

  /**
   * Helper to format public display information for a user
   */
  private formatUserSummary(user: any) {
    if (!user) return null;
    let name = user.email1.split('@')[0];
    let photoUrl: string | null = null;
    let subInfo: string | null = null;
    let location: string = 'India';

    if (user.artistProfile) {
      name = user.artistProfile.workingName || user.artistProfile.fullName || name;
      photoUrl = user.artistProfile.photoUrl;
      subInfo = user.artistProfile.careerStage || 'Artist';
      location = user.artistProfile.basedIn || 'India';
    } else if (user.galleryProfile) {
      name = user.galleryProfile.galleryName || name;
      photoUrl = user.galleryProfile.logoUrl;
      subInfo = user.galleryProfile.spaceType || 'Gallery';
      location = user.galleryProfile.locations?.[0]?.city || 'Mumbai, India';
    } else if (user.artProfessionalProfile) {
      name = user.artProfessionalProfile.displayName || name;
      photoUrl = user.artProfessionalProfile.photoUrl;
      subInfo = user.artProfessionalProfile.subType || 'Curator / Art Professional';
      location = user.artProfessionalProfile.city || 'India';
    } else if (user.collectorProfile) {
      const isPseudonymous = user.collectorProfile.isPseudonymous ?? false;
      name = isPseudonymous
        ? (user.collectorProfile.displayHandle || 'Private Collector')
        : (user.collectorProfile.displayHandle || 'Collector');
      subInfo = 'Collector';
      location = user.collectorProfile.city || 'India';
    }

    const initials = name
      .split(' ')
      .filter(Boolean)
      .map((w: string) => w[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();

    return {
      id: user.id,
      role: user.role,
      name,
      photoUrl,
      subInfo,
      location,
      initials,
      verificationStatus: user.verificationStatus,
    };
  }

  /**
   * POST /api/requests — initiate a request
   */
  async createRequest(requesterId: string, dto: CreateRequestDto) {
    if (requesterId === dto.recipientId) {
      throw new BadRequestException('You cannot send a request to yourself.');
    }

    const [requester, recipient] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: requesterId } }),
      this.prisma.user.findUnique({
        where: { id: dto.recipientId },
        include: { artistProfile: true },
      }),
    ]);

    if (!requester || !recipient) {
      throw new NotFoundException('Requester or recipient user not found.');
    }

    // Validate interaction rules matrix
    await this.validateInteractionRules(requester.role, recipient.role, dto.requestType);

    if (dto.portfolioItemIds?.length) {
      if (dto.requestType !== 'pvr') {
        throw new BadRequestException('Portfolio item selection is only supported for PVR requests.');
      }
      if (!recipient.artistProfile) {
        throw new BadRequestException('Specific PVR artworks can only be requested from an artist.');
      }
      const count = await this.prisma.portfolioItem.count({
        where: {
          id: { in: dto.portfolioItemIds },
          artistId: recipient.id,
          isPublic: false,
        },
      });
      if (count !== new Set(dto.portfolioItemIds).size) {
        throw new BadRequestException('One or more requested PVR artworks are invalid for this artist.');
      }
    }

    // Prevent duplicate pending request of the same type
    const existing = await this.prisma.request.findFirst({
      where: {
        requesterId,
        recipientId: dto.recipientId,
        requestType: dto.requestType,
        status: 'pending',
      },
    });

    if (existing) {
      throw new BadRequestException(
        `You already have a pending ${dto.requestType} request to this user.`,
      );
    }

    const created = await this.prisma.$transaction(async (tx) => {
      const request = await tx.request.create({
        data: {
          requesterId,
          recipientId: dto.recipientId,
          requestType: dto.requestType,
          message: dto.message,
          status: 'pending',
        },
      });

      // Record status history
      await tx.requestStatusHistory.create({
        data: {
          requestId: request.id,
          toStatus: 'pending',
          changedBy: requesterId,
          note: 'Request submitted.',
        },
      });

      // If requestType is 'visit', create VisitRequest details
      if (dto.requestType === 'visit') {
        await tx.visitRequest.create({
          data: {
            requestId: request.id,
            requestedDate: dto.requestedDate ? new Date(dto.requestedDate) : null,
            requestedTime: dto.requestedTime ? new Date(`1970-01-01T${dto.requestedTime}Z`) : null,
            location: dto.location,
            purpose: dto.purpose,
            status: 'pending',
          },
        });
      }

      // If requestType is 'pvr' and specific artworks requested, create PvrAccessGrantItem entries
      if (dto.requestType === 'pvr' && dto.portfolioItemIds && dto.portfolioItemIds.length > 0) {
        await tx.pvrAccessGrantItem.createMany({
          data: dto.portfolioItemIds.map((itemId) => ({
            requestId: request.id,
            portfolioItemId: itemId,
          })),
          skipDuplicates: true,
        });
      }

      return request;
    });

    await this.notifications.deliver(dto.recipientId, {
      actorId: requesterId,
      category: 'requests',
      type: `${dto.requestType}_received`,
      title: `New ${dto.requestType.replace('_', ' ')} request`,
      message: dto.message || `You received a new ${dto.requestType.replace('_', ' ')} request.`,
      link: this.roleRequestLink(recipient.role, dto.requestType),
      metadata: { requestId: created.id, requestType: dto.requestType },
      preference: 'requests',
      emailCategory: dto.requestType === 'pvr' ? 'PVR_REQUEST' : 'DIRECT_INQUIRY',
    });

    return created;
  }

  /**
   * GET /api/requests/sent — list requests sent by current user
   */
  async getSentRequests(userId: string) {
    const requests = await this.prisma.request.findMany({
      where: { requesterId: userId },
      include: {
        recipient: {
          include: {
            artistProfile: true,
            galleryProfile: true,
            artProfessionalProfile: true,
            collectorProfile: true,
          },
        },
        pvrGrant: true,
        pvrGrantItems: {
          include: {
            portfolioItem: true,
          },
        },
        visitRequest: true,
        thread: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return requests.map((r) => ({
      ...r,
      status: r.requestType === 'pvr' && r.pvrGrant?.completedAt ? 'completed' : r.status,
      recipient: this.formatUserSummary(r.recipient),
    }));
  }

  /**
   * GET /api/requests/received — list requests received by current user
   */
  async getReceivedRequests(userId: string) {
    const requests = await this.prisma.request.findMany({
      where: { recipientId: userId },
      include: {
        requester: {
          include: {
            artistProfile: true,
            galleryProfile: true,
            artProfessionalProfile: true,
            collectorProfile: true,
          },
        },
        pvrGrant: true,
        pvrGrantItems: {
          include: {
            portfolioItem: true,
          },
        },
        visitRequest: true,
        thread: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Auto-complete accepted visits whose scheduled date has passed
    const now = new Date();
    for (const r of requests) {
      if (r.status === 'accepted' && r.requestType === 'visit' && r.visitRequest && r.visitRequest.status !== 'completed') {
        const visitDate = r.visitRequest.confirmedDate || r.visitRequest.requestedDate;
        if (visitDate && new Date(visitDate) < now) {
          r.visitRequest.status = 'completed';
          this.prisma.visitRequest.updateMany({
            where: { requestId: r.id },
            data: { status: 'completed' },
          }).catch(() => {});
        }
      }
    }

    return requests.map((r) => ({
      ...r,
      status: (
        r.visitRequest?.status === 'completed' ||
        (r.requestType === 'pvr' && r.pvrGrant?.completedAt)
          ? 'completed'
          : r.status
      ) as any,
      requester: this.formatUserSummary(r.requester),
    }));
  }

  /**
   * GET /api/requests/:id — view request details
   */
  async getRequest(userId: string, requestId: string) {
    const request = await this.prisma.request.findUnique({
      where: { id: requestId },
      include: {
        requester: {
          include: {
            artistProfile: true,
            galleryProfile: true,
            artProfessionalProfile: true,
            collectorProfile: true,
          },
        },
        recipient: {
          include: {
            artistProfile: true,
            galleryProfile: true,
            artProfessionalProfile: true,
            collectorProfile: true,
          },
        },
        statusHistory: {
          orderBy: { changedAt: 'asc' },
        },
        pvrGrant: true,
        pvrGrantItems: {
          include: {
            portfolioItem: true,
          },
        },
        visitRequest: true,
        thread: true,
      },
    });

    if (!request) {
      throw new NotFoundException('Request not found.');
    }

    if (request.requesterId !== userId && request.recipientId !== userId) {
      throw new ForbiddenException('Access denied to this request.');
    }

    return {
      ...request,
      requester: this.formatUserSummary(request.requester),
      recipient: this.formatUserSummary(request.recipient),
    };
  }

  /**
   * PATCH /api/requests/:id/respond — accept or decline request
   * Decline feedback is strictly mandatory on decline!
   */
  async respondToRequest(userId: string, requestId: string, dto: RespondRequestDto) {
    const request = await this.prisma.request.findUnique({
      where: { id: requestId },
      include: { requester: { select: { role: true } } },
    });

    if (!request) {
      throw new NotFoundException('Request not found.');
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (request.recipientId !== userId && user?.role !== 'admin') {
      throw new ForbiddenException('Only the request recipient or an admin can accept or decline.');
    }

    if (request.status !== 'pending') {
      if (request.status === dto.status) {
        return request;
      }
      throw new BadRequestException(`Request has already been responded to (${request.status}).`);
    }

    // MANDATORY DECLINE FEEDBACK
    if (dto.status === 'declined') {
      if (!dto.declineFeedback || dto.declineFeedback.trim().length < 5) {
        throw new BadRequestException(
          'Mandatory decline feedback (minimum 5 characters) is required when declining any request.',
        );
      }
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      // 1. Update Request
      const updated = await tx.request.update({
        where: { id: requestId },
        data: {
          status: dto.status,
          declineReason: dto.declineReason,
          declineFeedback: dto.declineFeedback,
          respondedAt: new Date(),
        },
      });

      // 2. Add status history
      await tx.requestStatusHistory.create({
        data: {
          requestId,
          fromStatus: 'pending',
          toStatus: dto.status,
          changedBy: userId,
          note: dto.status === 'accepted' ? 'Request accepted.' : `Declined: ${dto.declineFeedback}`,
        },
      });

      // 3. Workflow triggers when accepted
      if (dto.status === 'accepted') {
        // Ensure originating Thread exists between requester and recipient
        let thread = await tx.thread.findFirst({
          where: { originatingRequestId: requestId },
        });

        if (!thread) {
          thread = await tx.thread.create({
            data: {
              originatingRequestId: requestId,
              participants: {
                create: [
                  { userId: request.requesterId },
                  { userId: request.recipientId },
                ],
              },
            },
          });
        }

        // A. PVR Request accepted -> Grant PVR access
        if (request.requestType === 'pvr') {
          if (dto.grantedPortfolioItemIds?.length) {
            const count = await tx.portfolioItem.count({
              where: {
                id: { in: dto.grantedPortfolioItemIds },
                artistId: request.recipientId,
                isPublic: false,
              },
            });
            if (count !== new Set(dto.grantedPortfolioItemIds).size) {
              throw new BadRequestException('One or more granted PVR artworks are invalid for this artist.');
            }
          }

          await tx.pvrAccessGrant.upsert({
            where: { requestId },
            create: {
              requestId,
              grantedAt: new Date(),
            },
            update: {
              grantedAt: new Date(),
              revokedAt: null,
            },
          });

          // If specific artwork IDs are confirmed in response
          if (dto.grantedPortfolioItemIds && dto.grantedPortfolioItemIds.length > 0) {
            await tx.pvrAccessGrantItem.deleteMany({
              where: { requestId },
            });
            await tx.pvrAccessGrantItem.createMany({
              data: dto.grantedPortfolioItemIds.map((itemId) => ({
                requestId,
                portfolioItemId: itemId,
              })),
              skipDuplicates: true,
            });
          }
        }

        // B. Visit Request accepted -> Mark visit status as accepted
        if (request.requestType === 'visit') {
          await tx.visitRequest.updateMany({
            where: { requestId },
            data: { status: 'accepted' },
          });
        }
      } else if (dto.status === 'declined') {
        if (request.requestType === 'visit') {
          await tx.visitRequest.updateMany({
            where: { requestId },
            data: { status: 'declined' },
          });
        }
      }

      return updated;
    });

    await this.notifications.deliver(request.requesterId, {
      actorId: userId,
      category: 'requests',
      type: `${request.requestType}_${dto.status}`,
      title: `${request.requestType.replace('_', ' ')} request ${dto.status}`,
      message: dto.status === 'accepted'
        ? `Your ${request.requestType.replace('_', ' ')} request was accepted.`
        : `Your ${request.requestType.replace('_', ' ')} request was declined: ${dto.declineFeedback}`,
      link: this.roleRequestLink(request.requester.role, request.requestType),
      metadata: { requestId, requestType: request.requestType, status: dto.status },
      preference: 'requests',
      emailCategory: request.requestType === 'pvr' ? 'PVR_STATUS_UPDATE' : 'DIRECT_INQUIRY',
    });

    return updated;
  }

  private roleRequestLink(role: UserRole, requestType: RequestType) {
    const prefix = role === 'gallery' ? '/galleries'
      : role === 'art_professional' ? '/art-professionals'
      : role === 'collector' ? '/collectors'
      : '/artists';
    return `${prefix}/${requestType === 'pvr' ? 'pvr-requests' : requestType === 'visit' ? 'visit-requests' : 'requests-activity'}`;
  }

  async withdrawRequest(userId: string, requestId: string, dto: WithdrawRequestDto) {
    const request = await this.prisma.request.findUnique({ where: { id: requestId } });

    if (!request) {
      throw new NotFoundException('Request not found.');
    }
    if (request.requesterId !== userId) {
      throw new ForbiddenException('Only the requester can withdraw this request.');
    }
    if (request.status !== 'pending') {
      throw new BadRequestException(`Request cannot be withdrawn after it is ${request.status}.`);
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.request.update({
        where: { id: requestId },
        data: {
          status: 'declined',
          declineReason: dto.declineReason || 'Withdrawn by requester',
          declineFeedback: dto.declineFeedback || 'The requester withdrew this PVR request before it was reviewed.',
          respondedAt: new Date(),
        },
      });

      await tx.requestStatusHistory.create({
        data: {
          requestId,
          fromStatus: 'pending',
          toStatus: 'declined',
          changedBy: userId,
          note: 'Request withdrawn by requester.',
        },
      });

      return updated;
    });

    await this.notifyOtherParty(request, userId, 'request_withdrawn', 'Request withdrawn',
      'The requester withdrew a pending request.');
    return updated;
  }

  /**
   * PATCH /api/requests/:id/visit/schedule — schedule or confirm visit date/time
   */
  async scheduleVisit(userId: string, requestId: string, dto: ScheduleVisitDto) {
    const request = await this.prisma.request.findUnique({
      where: { id: requestId },
      include: { visitRequest: true },
    });

    if (!request || !request.visitRequest) {
      throw new NotFoundException('Visit request not found.');
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (request.recipientId !== userId && request.requesterId !== userId && user?.role !== 'admin' && user?.role !== 'artist') {
      throw new ForbiddenException('Access denied.');
    }

    const visit = await this.prisma.$transaction(async (tx) => {
      // If request is still pending, accept it when scheduling
      if (request.status === 'pending') {
        await tx.request.update({
          where: { id: requestId },
          data: {
            status: 'accepted',
            respondedAt: new Date(),
          },
        });
        await tx.requestStatusHistory.create({
          data: {
            requestId,
            fromStatus: 'pending',
            toStatus: 'accepted',
            changedBy: userId,
            note: 'Visit scheduled and confirmed.',
          },
        });
      }

      // Ensure thread exists
      let thread = await tx.thread.findFirst({
        where: { originatingRequestId: requestId },
      });
      if (!thread) {
        await tx.thread.create({
          data: {
            originatingRequestId: requestId,
            participants: {
              create: [
                { userId: request.requesterId },
                { userId: request.recipientId },
              ],
            },
          },
        });
      }

      const visit = await tx.visitRequest.update({
        where: { requestId },
        data: {
          confirmedDate: new Date(dto.confirmedDate),
          confirmedTime: dto.confirmedTime ? new Date(`1970-01-01T${dto.confirmedTime}Z`) : null,
          location: dto.location,
          notes: dto.notes,
          status: dto.status || 'scheduled',
        },
      });

      await tx.visitStatusHistory.create({
        data: {
          visitId: visit.id,
          fromStatus: request.visitRequest?.status,
          toStatus: dto.status || 'scheduled',
          changedBy: userId,
          note: dto.notes || 'Visit scheduled.',
        },
      });

      return visit;
    });

    const when = new Date(dto.confirmedDate).toLocaleDateString('en-GB', {
      day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC',
    });
    await this.notifyOtherParty(request, userId, 'visit_scheduled', 'Visit scheduled',
      `Your visit has been scheduled for ${when}${dto.confirmedTime ? ` at ${dto.confirmedTime}` : ''}.`);
    return visit;
  }

  /**
   * PATCH /api/requests/:id/complete — mark visit as completed
   */
  async completeVisit(userId: string, requestId: string, notes?: string) {
    const request = await this.prisma.request.findUnique({
      where: { id: requestId },
      include: { visitRequest: true, pvrGrant: true },
    });

    if (!request || (request.requestType === 'visit' && !request.visitRequest) || (request.requestType === 'pvr' && !request.pvrGrant)) {
      throw new NotFoundException('Request workflow not found.');
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    const isParty = request.recipientId === userId || request.requesterId === userId;
    const isArtistOrAdmin = user?.role === 'admin' || user?.role === 'artist';
    if (!isParty && !isArtistOrAdmin) {
      throw new ForbiddenException('Access denied.');
    }

    const completed = await this.prisma.$transaction(async (tx) => {
      if (request.requestType === 'pvr' && request.pvrGrant) {
        return tx.pvrAccessGrant.update({
          where: { requestId },
          data: {
            completedAt: new Date(),
            notes: notes || request.pvrGrant.notes,
          },
        });
      }

      const visit = await tx.visitRequest.update({
        where: { requestId },
        data: {
          status: 'completed',
          notes: notes || request.visitRequest?.notes,
        },
      });

      await tx.visitStatusHistory.create({
        data: {
          visitId: visit.id,
          fromStatus: request.visitRequest?.status,
          toStatus: 'completed',
          changedBy: userId,
          note: notes || 'Visit marked as completed.',
        },
      });

      return visit;
    });
    await this.notifyOtherParty(request, userId, `${request.requestType}_completed`,
      `${request.requestType === 'pvr' ? 'Private viewing' : 'Visit'} completed`,
      `The ${request.requestType === 'pvr' ? 'private viewing' : 'visit'} was marked as completed.`);
    return completed;
  }

  private async notifyOtherParty(
    request: { requesterId: string; recipientId: string; requestType: RequestType },
    actorId: string,
    type: string,
    title: string,
    message: string,
  ) {
    const recipientId = request.requesterId === actorId ? request.recipientId : request.requesterId;
    const recipient = await this.prisma.user.findUnique({ where: { id: recipientId }, select: { role: true } });
    if (!recipient) return;
    await this.notifications.deliver(recipientId, {
      actorId,
      category: 'requests',
      type,
      title,
      message,
      link: this.roleRequestLink(recipient.role, request.requestType),
      metadata: { requestType: request.requestType },
      preference: 'requests',
      emailCategory: request.requestType === 'pvr' ? 'PVR_STATUS_UPDATE' : 'DIRECT_INQUIRY',
    });
  }

  /**
   * GET /api/requests/activity — unified chronological activity feed for user
   */
  async getActivity(userId: string) {
    // 1. Fetch requests (both received and sent)
    const requests = await this.prisma.request.findMany({
      where: {
        OR: [{ recipientId: userId }, { requesterId: userId }],
      },
      include: {
        requester: {
          include: {
            artistProfile: true,
            galleryProfile: true,
            artProfessionalProfile: true,
            collectorProfile: true,
          },
        },
        recipient: {
          include: {
            artistProfile: true,
            galleryProfile: true,
            artProfessionalProfile: true,
            collectorProfile: true,
          },
        },
        visitRequest: true,
        pvrGrant: true,
        pvrGrantItems: {
          include: { portfolioItem: true },
        },
        statusHistory: {
          orderBy: { changedAt: 'desc' },
          take: 3,
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 25,
    });

    // 2. Fetch pitches (if user is an artist) or pitches received (if user posted briefs)
    const pitches = await this.prisma.pitch.findMany({
      where: {
        OR: [
          { artistId: userId },
          { brief: { postedByUserId: userId } },
        ],
      },
      include: {
        brief: {
          include: {
            postedBy: {
              include: {
                galleryProfile: true,
                artProfessionalProfile: true,
              },
            },
          },
        },
        artist: true,
        statusHistory: {
          orderBy: { changedAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: 15,
    });

    // 3. Fetch latest messages from user's threads
    const messages = await this.prisma.threadMessage.findMany({
      where: {
        thread: {
          participants: {
            some: { userId },
          },
        },
        senderId: { not: userId },
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
      orderBy: { sentAt: 'desc' },
      take: 15,
    });

    const activities: any[] = [];

    const formatDateMeta = (d: Date) => {
      const now = new Date();
      const diffMs = now.getTime() - d.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      let timestampDay = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
      if (diffDays === 0) timestampDay = 'Today';
      else if (diffDays === 1) timestampDay = 'Yesterday';

      const timestampTime = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
      return { timestampDay, timestampTime, timestampRaw: d.getTime() };
    };

    // Transform requests
    for (const req of requests) {
      const isRecipient = req.recipientId === userId;
      const otherUser = isRecipient ? req.requester : req.recipient;
      const otherSummary = this.formatUserSummary(otherUser);
      const otherName = otherSummary?.name || 'A user';
      const timeMeta = formatDateMeta(req.createdAt);

      if (req.requestType === 'visit') {
        const visitDate = req.visitRequest?.requestedDate
          ? new Date(req.visitRequest.requestedDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
          : '';
        activities.push({
          id: `visit-${req.id}`,
          category: 'visit',
          title: otherName,
          actionText: isRecipient
            ? `requested to visit your studio${visitDate ? ` on ${visitDate}` : ''}.`
            : `Studio visit request sent to ${otherName}.`,
          quoteSnippet: req.message ? `“${req.message}”` : undefined,
          badgeLabel: 'Visit Request',
          badgeBg: 'bg-[#EBF3FB]',
          badgeColor: 'text-[#1B6CA8]',
          ...timeMeta,
          avatarType: otherSummary?.photoUrl ? 'image' : 'tarq',
          avatarImage: otherSummary?.photoUrl || undefined,
          primaryAction: isRecipient && req.status === 'pending'
            ? { label: 'Review', href: '/artists/visit-requests' }
            : undefined,
          secondaryAction: { label: 'View details', href: '/artists/visit-requests' },
          detailsLink: '/artists/visit-requests',
        });
      } else if (req.requestType === 'pvr') {
        const workCount = req.pvrGrantItems?.length || 0;
        activities.push({
          id: `pvr-${req.id}`,
          category: 'pvr',
          title: otherName,
          actionText: isRecipient
            ? `requested to view ${workCount > 0 ? `${workCount} of your private works` : 'your Private Viewing Room'}.`
            : `PVR viewing request sent to ${otherName}.`,
          quoteSnippet: req.message ? `“${req.message}”` : undefined,
          badgeLabel: 'PVR Request',
          badgeBg: 'bg-[#FBECEE]',
          badgeColor: 'text-[#8C2E3E]',
          ...timeMeta,
          avatarType: 'image',
          avatarImage: otherSummary?.photoUrl || undefined,
          primaryAction: isRecipient && req.status === 'pending'
            ? { label: 'Review', href: '/artists/pvr-requests' }
            : undefined,
          secondaryAction: { label: 'View details', href: '/artists/pvr-requests' },
          detailsLink: '/artists/pvr-requests',
        });
      } else {
        activities.push({
          id: `req-${req.id}`,
          category: 'requests',
          title: otherName,
          actionText: `${req.requestType.toUpperCase()} request: ${req.status}.`,
          quoteSnippet: req.message ? `“${req.message}”` : undefined,
          badgeLabel: req.requestType.toUpperCase(),
          badgeBg: 'bg-[#FAF8F5]',
          badgeColor: 'text-[#77736C]',
          ...timeMeta,
          avatarType: 'icon',
          secondaryAction: { label: 'View conversations', href: '/artists/conversations' },
          detailsLink: '/artists/conversations',
        });
      }
    }

    // Transform pitches
    for (const pitch of pitches) {
      const isArtist = pitch.artistId === userId;
      const briefTitle = pitch.brief?.title || 'Brief';
      const timeMeta = formatDateMeta(pitch.updatedAt || pitch.createdAt);

      if (isArtist) {
        const galleryName = pitch.brief?.postedBy?.galleryProfile?.galleryName || 'Curatorial Team';
        activities.push({
          id: `pitch-${pitch.id}`,
          category: 'pitch',
          title: galleryName,
          actionText: pitch.status === 'submitted'
            ? `queued your pitch for “${briefTitle}”.`
            : pitch.status === 'accepted'
            ? `accepted your pitch for “${briefTitle}”! 🎉`
            : pitch.status === 'under_review'
            ? `is reviewing your pitch for “${briefTitle}”.`
            : `updated status for pitch “${briefTitle}” to ${pitch.status}.`,
          badgeLabel: 'Pitch',
          badgeBg: 'bg-[#FBF1EC]',
          badgeColor: 'text-[#9A4C1C]',
          ...timeMeta,
          avatarType: 'km',
          secondaryAction: { label: 'View pitch', href: `/artists/my-pitches/${pitch.id}` },
          detailsLink: `/artists/my-pitches/${pitch.id}`,
        });
      } else {
        activities.push({
          id: `pitch-${pitch.id}`,
          category: 'pitch',
          title: pitch.artist?.workingName || 'Artist',
          actionText: `submitted a pitch for your brief “${briefTitle}”.`,
          quoteSnippet: pitch.statement ? `“${pitch.statement.slice(0, 80)}...”` : undefined,
          badgeLabel: 'Pitch Received',
          badgeBg: 'bg-[#FBF1EC]',
          badgeColor: 'text-[#9A4C1C]',
          ...timeMeta,
          avatarType: 'image',
          avatarImage: pitch.artist?.photoUrl || undefined,
          secondaryAction: { label: 'Review pitch', href: `/opportunities/${pitch.briefId}` },
          detailsLink: `/opportunities/${pitch.briefId}`,
        });
      }
    }

    // Transform messages
    for (const msg of messages) {
      const senderSummary = this.formatUserSummary(msg.sender);
      const timeMeta = formatDateMeta(msg.sentAt);
      activities.push({
        id: `msg-${msg.id}`,
        category: 'message',
        title: senderSummary?.name || 'A contact',
        actionText: 'sent you a new message.',
        quoteSnippet: msg.body ? `“${msg.body.slice(0, 90)}”` : undefined,
        badgeLabel: 'Message',
        badgeBg: 'bg-[#EAF5EA]',
        badgeColor: 'text-[#2A7E3B]',
        ...timeMeta,
        avatarType: senderSummary?.photoUrl ? 'image' : 'icon',
        avatarImage: senderSummary?.photoUrl || undefined,
        secondaryAction: { label: 'View message', href: '/artists/conversations' },
        detailsLink: '/artists/conversations',
      });
    }

    // 4. Fetch verification submissions for user
    const userRole = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    const rolePrefix = userRole?.role === 'gallery' ? '/galleries'
      : userRole?.role === 'art_professional' ? '/art-professionals'
      : userRole?.role === 'collector' ? '/collectors'
      : '/artists';

    const verifications = await this.prisma.verificationSubmission.findMany({
      where: { userId },
      orderBy: { submittedAt: 'desc' },
      take: 10,
    });

    for (const v of verifications) {
      const timeMeta = formatDateMeta(v.reviewedAt || v.submittedAt);
      if (v.decision === 'rejected') {
        activities.push({
          id: `verif-${v.id}`,
          category: 'verification',
          title: 'Verification Request Declined',
          actionText: v.reviewerNotes
            ? `Your verification application was rejected: “${v.reviewerNotes}”. Please update your details and resubmit.`
            : 'Your verification submission was not approved. Please update your details and resubmit.',
          badgeLabel: 'Action Required',
          badgeBg: 'bg-[#FDEBEB]',
          badgeColor: 'text-[#C93B3B]',
          ...timeMeta,
          avatarType: 'icon',
          secondaryAction: { label: 'Update & Resubmit', href: `${rolePrefix}/verification` },
          detailsLink: `${rolePrefix}/verification`,
        });
      } else if (v.decision === 'verified') {
        activities.push({
          id: `verif-${v.id}`,
          category: 'verification',
          title: 'Account Officially Verified',
          actionText: 'Congratulations! Your credentials have been approved by the PLINTH IQ curation committee.',
          badgeLabel: 'Verified',
          badgeBg: 'bg-[#EDF7ED]',
          badgeColor: 'text-[#2E7D32]',
          ...timeMeta,
          avatarType: 'icon',
          secondaryAction: { label: 'View status', href: `${rolePrefix}/verification` },
          detailsLink: `${rolePrefix}/verification`,
        });
      } else if (v.decision === 'pending') {
        activities.push({
          id: `verif-${v.id}`,
          category: 'verification',
          title: 'Verification Application Under Review',
          actionText: 'Your verification dossier is currently under review by our curation team.',
          badgeLabel: 'Under Review',
          badgeBg: 'bg-[#FEF3C7]',
          badgeColor: 'text-[#92400E]',
          ...timeMeta,
          avatarType: 'icon',
          secondaryAction: { label: 'Check status', href: `${rolePrefix}/verification` },
          detailsLink: `${rolePrefix}/verification`,
        });
      }
    }

    // Sort all by timestampRaw descending
    activities.sort((a, b) => b.timestampRaw - a.timestampRaw);

    return activities;
  }

  // ─── Private Viewing Room (PVR) Dynamic Operations ─────────────

  /**
   * Resolves a full PVR session by requestId or threadId (or demo fallback)
   */
  async getPvrSession(userId: string, sessionId: string) {
    const isUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(sessionId);

    let request: any = null;

    if (isUuid) {
      // 1. Try finding request by id
      request = await this.prisma.request.findUnique({
        where: { id: sessionId },
        include: {
          requester: {
            include: {
              artistProfile: true,
              galleryProfile: { include: { locations: true } },
              artProfessionalProfile: true,
              collectorProfile: true,
            },
          },
          recipient: {
            include: {
              artistProfile: true,
              galleryProfile: { include: { locations: true } },
              artProfessionalProfile: true,
              collectorProfile: true,
            },
          },
          pvrGrant: true,
          pvrGrantItems: {
            include: {
              portfolioItem: true,
            },
          },
          thread: {
            include: {
              participants: {
                include: {
                  user: {
                    include: {
                      artistProfile: true,
                      galleryProfile: { include: { locations: true } },
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
          },
        },
      });

      // 2. If not found by request.id, try finding request via thread.id
      if (!request) {
        request = await this.prisma.request.findFirst({
          where: {
            thread: {
              some: { id: sessionId },
            },
          },
          include: {
            requester: {
              include: {
                artistProfile: true,
                galleryProfile: { include: { locations: true } },
                artProfessionalProfile: true,
                collectorProfile: true,
              },
            },
            recipient: {
              include: {
                artistProfile: true,
                galleryProfile: { include: { locations: true } },
                artProfessionalProfile: true,
                collectorProfile: true,
              },
            },
            pvrGrant: true,
            pvrGrantItems: {
              include: {
                portfolioItem: true,
              },
            },
            thread: {
              include: {
                participants: {
                  include: {
                    user: {
                      include: {
                        artistProfile: true,
                        galleryProfile: { include: { locations: true } },
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
            },
          },
        });
      }
    }

    // If real request is found in DB:
    if (request) {
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      const isParticipant =
        request.requesterId === userId ||
        request.recipientId === userId ||
        user?.role === 'admin';

      if (!isParticipant) {
        throw new ForbiddenException('You do not have permission to access this private viewing room.');
      }

      if (request.requestType !== 'pvr') {
        throw new BadRequestException('This request is not a private viewing request.');
      }

      if (!['accepted', 'completed'].includes(request.status)) {
        throw new ForbiddenException('Private viewing access is available only after the artist accepts the request.');
      }

      // The recipient grants access; the requester is the viewer. Gallery-hosted
      // PVRs may contain no artist works until the gallery supplies them.
      const hostUser = request.recipient;
      const viewerUser = request.requester;
      const artistId = hostUser.role === 'artist' ? hostUser.id : null;

      // Accepted PVRs normally receive their grant in respondToRequest. Keep this
      // repair path for legacy accepted requests created before that workflow.
      let pvrGrant = request.pvrGrant;
      if (!pvrGrant) {
        pvrGrant = await this.prisma.pvrAccessGrant.create({
          data: {
            requestId: request.id,
            grantedAt: request.respondedAt || new Date(),
          },
        });
      }

      // Ensure Thread exists
      let thread = request.thread?.[0];
      if (!thread) {
        thread = await this.prisma.thread.create({
          data: {
            originatingRequestId: request.id,
            participants: {
              create: [
                { userId: request.requesterId },
                { userId: request.recipientId },
              ],
            },
          },
          include: {
            participants: {
              include: {
                user: {
                  include: {
                    artistProfile: true,
                    galleryProfile: { include: { locations: true } },
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
      }

      // Fetch all available works of this artist
      const artistAllArtworks = artistId
        ? await this.prisma.portfolioItem.findMany({
            where: { artistId },
            orderBy: { sortOrder: 'asc' },
          })
        : [];

      // Selected artworks for this PVR session
      let viewingArtworks = (request.pvrGrantItems || []).map((gi: any) => gi.portfolioItem).filter(Boolean);
      // If none specifically assigned yet, default to all private works (or first 4 works if none private)
      if (viewingArtworks.length === 0) {
        const privateWorks = artistAllArtworks.filter((w: any) => !w.isPublic);
        viewingArtworks = privateWorks.length > 0 ? privateWorks : artistAllArtworks.slice(0, 4);
      }

      const viewingArtworkIds = new Set(viewingArtworks.map((w: any) => w.id));

      const hostSummary = this.formatUserSummary(hostUser);
      const viewerSummary = this.formatUserSummary(viewerUser);

      // Attendees
      const attendees = [
        {
          name: hostSummary?.name || 'Artist',
          image: hostSummary?.photoUrl || undefined,
          text: hostSummary?.initials || 'AR',
          role: 'Host',
        },
        {
          name: viewerSummary?.name || 'Viewer',
          image: viewerSummary?.photoUrl || undefined,
          text: viewerSummary?.initials || 'VR',
          role: viewerSummary?.subInfo || 'Viewer',
        },
      ];

      // Parse shared documents
      const rawSharedDocs = (pvrGrant?.sharedDocuments as any) || [];
      const sharedDocuments = Array.isArray(rawSharedDocs) ? rawSharedDocs : [];

      const formattedMessages = (thread.messages || []).map((m: any) => {
        const isHost = m.senderId === hostUser.id;
        const senderSummary = this.formatUserSummary(m.sender);
        return {
          id: m.id,
          sender: isHost ? ('artist' as const) : ('viewer' as const),
          senderName: senderSummary?.name || (isHost ? 'Artist' : 'Viewer'),
          senderAvatar: senderSummary?.photoUrl || undefined,
          senderInitials: senderSummary?.initials || (isHost ? 'AR' : 'VR'),
          time: new Date(m.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          text: m.body,
        };
      });

      return {
        isDemo: false,
        requestId: request.id,
        sessionId: request.id,
        threadId: thread.id,
        status: request.status,
        isActive: !pvrGrant?.revokedAt,
        grantedAt: pvrGrant?.grantedAt ? new Date(pvrGrant.grantedAt).toISOString() : new Date().toISOString(),
        revokedAt: pvrGrant?.revokedAt ? new Date(pvrGrant.revokedAt).toISOString() : null,
        host: hostSummary,
        counterparty: viewerSummary,
        attendees,
        artworks: viewingArtworks.map((art: any) => ({
          id: art.id,
          title: art.title || 'Untitled',
          medium: art.medium || 'Contemporary Medium',
          dimensions: art.dimensions || 'Dimensions on request',
          year: art.year ? String(art.year) : '2024',
          image: art.imageUrl || '/images/artwork_fragments_of_memory.jpg',
          isPublic: art.isPublic,
          contextNotes: art.contextNotes,
        })),
        availableArtworks: artistAllArtworks.map((art: any) => ({
          id: art.id,
          title: art.title || 'Untitled',
          medium: art.medium || 'Contemporary Medium',
          dimensions: art.dimensions || 'Dimensions on request',
          year: art.year ? String(art.year) : '2024',
          image: art.imageUrl || '/images/artwork_fragments_of_memory.jpg',
          isPublic: art.isPublic,
          isSelected: viewingArtworkIds.has(art.id),
        })),
        sharedDocuments,
        notes: pvrGrant?.notes || '',
        messages: formattedMessages,
      };
    }

    throw new NotFoundException('Private viewing room session not found.');
  }

  /**
   * Update artworks assigned to a PVR access grant
   */
  async updatePvrArtworks(userId: string, requestId: string, portfolioItemIds: string[]) {
    const request = await this.prisma.request.findUnique({
      where: { id: requestId },
      include: { pvrGrant: true },
    });

    if (!request) {
      throw new NotFoundException('PVR Request not found.');
    }

    if (request.recipientId !== userId && request.requesterId !== userId) {
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (user?.role !== 'admin') {
        throw new ForbiddenException('Access denied to update PVR artworks.');
      }
    }

    // Replace items in pvrAccessGrantItem
    await this.prisma.$transaction(async (tx) => {
      await tx.pvrAccessGrantItem.deleteMany({
        where: { requestId },
      });

      if (portfolioItemIds.length > 0) {
        await tx.pvrAccessGrantItem.createMany({
          data: portfolioItemIds.map((itemId) => ({
            requestId,
            portfolioItemId: itemId,
          })),
          skipDuplicates: true,
        });
      }
    });

    return this.getPvrSession(userId, requestId);
  }

  /**
   * Share a document in a PVR session
   */
  async sharePvrDocument(userId: string, requestId: string, doc: SharePvrDocumentDto) {
    const request = await this.prisma.request.findUnique({
      where: { id: requestId },
      include: { pvrGrant: true, thread: true },
    });

    if (!request) {
      throw new NotFoundException('PVR Request not found.');
    }

    let grant = request.pvrGrant;
    if (!grant) {
      grant = await this.prisma.pvrAccessGrant.create({
        data: { requestId, grantedAt: new Date() },
      });
    }

    const currentDocs = Array.isArray(grant.sharedDocuments) ? (grant.sharedDocuments as any[]) : [];
    const newDoc = {
      id: `doc-${Date.now()}`,
      name: doc.name,
      url: doc.url,
      size: doc.size || '1.5 MB',
      type: doc.type || 'PDF',
      sharedAt: new Date().toISOString(),
      sharedBy: userId,
    };

    const updatedDocs = [...currentDocs, newDoc];

    await this.prisma.pvrAccessGrant.update({
      where: { requestId },
      data: {
        sharedDocuments: updatedDocs,
      },
    });

    // Also post a message to the thread if thread exists
    const thread = request.thread?.[0];
    if (thread) {
      await this.prisma.threadMessage.create({
        data: {
          threadId: thread.id,
          senderId: userId,
          body: `[Document Shared] ${doc.name} (${doc.size || 'PDF'})`,
        },
      }).catch(() => {});
    }

    return {
      success: true,
      document: newDoc,
      sharedDocuments: updatedDocs,
    };
  }

  /**
   * Save private notes for a PVR session
   */
  async updatePvrNotes(userId: string, requestId: string, notes: string) {
    const request = await this.prisma.request.findUnique({
      where: { id: requestId },
      include: { pvrGrant: true },
    });

    if (!request) {
      throw new NotFoundException('PVR Request not found.');
    }

    let grant = request.pvrGrant;
    if (!grant) {
      grant = await this.prisma.pvrAccessGrant.create({
        data: { requestId, grantedAt: new Date(), notes },
      });
    } else {
      await this.prisma.pvrAccessGrant.update({
        where: { requestId },
        data: { notes },
      });
    }

    return {
      success: true,
      notes,
    };
  }

  /**
   * Toggle PVR session status (End Session vs Resume Session)
   */
  async togglePvrSessionStatus(userId: string, requestId: string, isActive: boolean) {
    const request = await this.prisma.request.findUnique({
      where: { id: requestId },
      include: { pvrGrant: true },
    });

    if (!request) {
      throw new NotFoundException('PVR Request not found.');
    }

    const revokedAt = isActive ? null : new Date();

    let grant = request.pvrGrant;
    if (!grant) {
      grant = await this.prisma.pvrAccessGrant.create({
        data: { requestId, grantedAt: new Date(), revokedAt },
      });
    } else {
      await this.prisma.pvrAccessGrant.update({
        where: { requestId },
        data: { revokedAt },
      });
    }

    return {
      success: true,
      isActive,
      revokedAt,
    };
  }
}
