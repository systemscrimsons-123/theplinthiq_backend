import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  UpdateUserStatusDto,
  QueryUsersDto,
  UpdatePermissionDto,
  UpdateBriefStatusDto,
  QueryAdminBriefsDto,
  QueryAdminPitchesDto,
  QueryAdminRequestsDto,
  QueryActivityDto,
} from './dto/admin.dto';
import { UserRole, BriefStatus } from '@prisma/client';
import {
  getInteractionPolicy,
  INTERACTION_POLICY,
} from '../../common/policies/interaction-policy';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  /**
   * System-wide Engagement KPIs
   */
  async getKpis() {
    const [
      totalUsers,
      membersTotal,
      adminsTotal,
      usersByRole,
      usersByStatus,
      usersByVerification,
      totalBriefs,
      briefsByType,
      totalPitches,
      submittedPitches,
      draftPitches,
      pitchesByStatus,
      totalRequests,
      requestsByType,
      requestsByStatus,
      totalVisits,
      visitsByStatus,
      pendingVerifications,
      verifiedVerifications,
      rejectedVerifications,
      totalVerifications,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { role: { not: 'admin' } } }),
      this.prisma.user.count({ where: { role: 'admin' } }),
      this.prisma.user.groupBy({
        by: ['role'],
        _count: { id: true },
      }),
      this.prisma.user.groupBy({
        by: ['status'],
        _count: { id: true },
      }),
      this.prisma.user.groupBy({
        by: ['verificationStatus'],
        _count: { id: true },
      }),
      this.prisma.brief.count(),
      this.prisma.brief.groupBy({
        by: ['briefType'],
        _count: { id: true },
      }),
      this.prisma.pitch.count(),
      this.prisma.pitch.count({
        where: { status: { not: 'saved' } },
      }),
      this.prisma.pitch.count({
        where: { status: 'saved' },
      }),
      this.prisma.pitch.groupBy({
        by: ['status'],
        _count: { id: true },
      }),
      this.prisma.request.count(),
      this.prisma.request.groupBy({
        by: ['requestType'],
        _count: { id: true },
      }),
      this.prisma.request.groupBy({
        by: ['status'],
        _count: { id: true },
      }),
      this.prisma.visitRequest.count(),
      this.prisma.visitRequest.groupBy({
        by: ['status'],
        _count: { id: true },
      }),
      this.prisma.verificationSubmission.count({
        where: { decision: 'pending' },
      }),
      this.prisma.verificationSubmission.count({
        where: { decision: 'verified' },
      }),
      this.prisma.verificationSubmission.count({
        where: { decision: 'rejected' },
      }),
      this.prisma.verificationSubmission.count(),
    ]);

    const formatGroup = (arr: any[], key: string) =>
      arr.reduce((acc, curr) => {
        acc[curr[key]] = curr._count.id;
        return acc;
      }, {} as Record<string, number>);

    return {
      users: {
        total: totalUsers,
        membersTotal,
        adminsTotal,
        byRole: formatGroup(usersByRole, 'role'),
        byStatus: formatGroup(usersByStatus, 'status'),
        byVerificationStatus: formatGroup(usersByVerification, 'verificationStatus'),
      },
      opportunities: {
        total: totalBriefs,
        byType: formatGroup(briefsByType, 'briefType'),
      },
      pitches: {
        total: submittedPitches,         // Strictly submitted pitches against open calls (excluding drafts)
        totalAll: totalPitches,          // All pitch records including saved drafts
        submittedCount: submittedPitches,
        drafts: draftPitches,            // In-progress saved drafts
        byStatus: formatGroup(pitchesByStatus, 'status'),
      },
      requests: {
        total: totalRequests,
        byType: formatGroup(requestsByType, 'requestType'),
        byStatus: formatGroup(requestsByStatus, 'status'),
      },
      visits: {
        total: totalVisits,
        byStatus: formatGroup(visitsByStatus, 'status'),
      },
      verification: {
        total: totalVerifications,
        pendingQueue: pendingVerifications,
        pending: pendingVerifications,
        verified: verifiedVerifications,
        approved: verifiedVerifications,
        rejected: rejectedVerifications,
      },
    };
  }

  /**
   * List users for administration
   */
  async listUsers(query: QueryUsersDto) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const where: any = {};

    if (query.role) where.role = query.role;
    if (query.status) where.status = query.status;
    if (query.verificationStatus) where.verificationStatus = query.verificationStatus;

    if (query.search) {
      where.OR = [
        { email1: { contains: query.search, mode: 'insensitive' } },
        { email2: { contains: query.search, mode: 'insensitive' } },
        { phone1: { contains: query.search, mode: 'insensitive' } },
        { artistProfile: { workingName: { contains: query.search, mode: 'insensitive' } } },
        { galleryProfile: { galleryName: { contains: query.search, mode: 'insensitive' } } },
        { artProfessionalProfile: { displayName: { contains: query.search, mode: 'insensitive' } } },
        { collectorProfile: { displayHandle: { contains: query.search, mode: 'insensitive' } } },
      ];
    }

    const [total, users] = await Promise.all([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email1: true,
          email2: true,
          phone1: true,
          phone2: true,
          role: true,
          status: true,
          verificationStatus: true,
          emailVerifiedAt: true,
          onboardingCompleted: true,
          createdAt: true,
          artistProfile: {
            select: { workingName: true, city: true, country: true, careerStage: true },
          },
          galleryProfile: {
            select: { galleryName: true, spaceType: true },
          },
          artProfessionalProfile: {
            select: { displayName: true, subType: true },
          },
          collectorProfile: {
            select: { displayHandle: true, city: true, country: true },
          },
        },
      }),
    ]);

    return {
      data: users.map((u) => {
        let displayName = u.email1.split('@')[0];
        if (u.artistProfile) displayName = u.artistProfile.workingName;
        else if (u.galleryProfile) displayName = u.galleryProfile.galleryName;
        else if (u.artProfessionalProfile) displayName = u.artProfessionalProfile.displayName;
        else if (u.collectorProfile) displayName = u.collectorProfile.displayHandle;

        return {
          ...u,
          displayName,
        };
      }),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * User detail for administration
   */
  async getUserDetail(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        artistProfile: {
          include: {
            mediums: { include: { medium: true } },
            scaleRanges: true,
            materialTags: true,
            cvEntries: { orderBy: { year: 'desc' } },
            portfolioItems: { orderBy: { sortOrder: 'asc' } },
          },
        },
        galleryProfile: {
          include: {
            locations: true,
            mediums: { include: { medium: true } },
            targetStages: true,
            exhibitions: { orderBy: { startDate: 'desc' } },
            roster: {
              include: {
                artist: {
                  select: { userId: true, workingName: true, careerStage: true },
                },
              },
            },
          },
        },
        artProfessionalProfile: {
          include: {
            interests: { include: { interest: true } },
            preferences: {
              include: {
                mediums: { include: { medium: true } },
              },
            },
          },
        },
        collectorProfile: {
          include: {
            interests: { include: { interest: true } },
            careerPrefs: true,
            intents: true,
            collections: {
              include: {
                _count: { select: { items: true } },
              },
            },
          },
        },
        verificationSubmissions: {
          orderBy: { submittedAt: 'desc' },
        },
        _count: {
          select: {
            sentRequests: true,
            receivedRequests: true,
            postedBriefs: true,
            shortlists: true,
            follows: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found.');
    }

    let displayName = user.email1.split('@')[0];
    if (user.artistProfile) displayName = user.artistProfile.workingName;
    else if (user.galleryProfile) displayName = user.galleryProfile.galleryName;
    else if (user.artProfessionalProfile) displayName = user.artProfessionalProfile.displayName;
    else if (user.collectorProfile) displayName = user.collectorProfile.displayHandle;

    return {
      ...user,
      displayName,
    };
  }

  /**
   * Activate, deactivate or modify user account status
   */
  async updateUserStatus(adminId: string, targetUserId: string, dto: UpdateUserStatusDto) {
    const targetUser = await this.prisma.user.findUnique({
      where: { id: targetUserId },
    });

    if (!targetUser) {
      throw new NotFoundException('User not found.');
    }
    if (targetUser.status === dto.status) {
      throw new BadRequestException(`Account is already ${dto.status}.`);
    }
    if (adminId === targetUserId && dto.status !== 'active') {
      throw new BadRequestException('Administrators cannot disable their own account.');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const updatedUser = await tx.user.update({
        where: { id: targetUserId },
        data: {
          status: dto.status,
        },
      });

      await tx.adminAction.create({
        data: {
          adminId,
          targetUserId,
          actionType: 'UPDATE_ACCOUNT_STATUS',
          notes: `Status changed from ${targetUser.status} to ${dto.status}. ${dto.notes || ''}`.trim(),
        },
      });

      return {
        message: `User status updated to ${dto.status}.`,
        user: {
          id: updatedUser.id,
          email: updatedUser.email1,
          role: updatedUser.role,
          status: updatedUser.status,
        },
      };
    });

    await this.notifications.deliver(targetUserId, {
      actorId: adminId,
      category: 'system',
      type: 'account_status_changed',
      title: 'Account status changed',
      message: `An administrator changed your account status from ${targetUser.status} to ${dto.status}.${dto.notes ? ` Note: ${dto.notes}` : ''}`,
      link: this.accountSettingsLink(targetUser.role),
      metadata: { previousStatus: targetUser.status, status: dto.status },
      preference: 'security',
      emailCategory: 'SYSTEM',
    });
    await this.notifyOtherAdmins(adminId, 'Account governance change',
      `${targetUser.email1} changed from ${targetUser.status} to ${dto.status}.`,
      '/admin/users');

    return result;
  }

  private accountSettingsLink(role: UserRole) {
    if (role === 'gallery') return '/galleries/settings';
    if (role === 'art_professional') return '/art-professionals/settings';
    if (role === 'collector') return '/collectors/settings';
    if (role === 'admin') return '/admin/settings';
    return '/artists/settings';
  }

  // ─── Briefs Management ───────────────────────────────────────────────

  async getBriefs(query: QueryAdminBriefsDto) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.briefType) where.briefType = query.briefType;
    if (query.status) where.status = query.status;
    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
        { location: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [total, briefs] = await Promise.all([
      this.prisma.brief.count({ where }),
      this.prisma.brief.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          postedBy: {
            select: {
              id: true,
              role: true,
              email1: true,
              galleryProfile: { select: { galleryName: true } },
              artProfessionalProfile: { select: { displayName: true } },
              collectorProfile: { select: { displayHandle: true } },
            },
          },
          mediums: { include: { medium: true } },
          _count: { select: { pitches: true } },
        },
      }),
    ]);

    return {
      data: briefs.map((b) => {
        let posterName = b.postedBy.email1.split('@')[0];
        if (b.postedBy.galleryProfile) posterName = b.postedBy.galleryProfile.galleryName;
        else if (b.postedBy.artProfessionalProfile) posterName = b.postedBy.artProfessionalProfile.displayName;
        else if (b.postedBy.collectorProfile) posterName = b.postedBy.collectorProfile.displayHandle;

        return {
          id: b.id,
          title: b.title,
          briefType: b.briefType,
          status: b.status,
          submissionDeadline: b.submissionDeadline,
          eventStartDate: b.eventStartDate,
          eventEndDate: b.eventEndDate,
          location: b.location,
          createdAt: b.createdAt,
          posterName,
          posterRole: b.postedBy?.role || 'user',
          posterId: b.postedBy?.id || b.postedByUserId,
          postedBy: {
            id: b.postedBy?.id || b.postedByUserId,
            role: b.postedBy?.role || 'user',
            name: posterName,
            email: b.postedBy?.email1 || '',
          },
          pitchesCount: b._count.pitches,
          mediums: b.mediums.map((m) => m.medium),
        };
      }),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async updateBriefStatus(adminId: string, briefId: string, status: BriefStatus) {
    const brief = await this.prisma.brief.findUnique({ where: { id: briefId } });
    if (!brief) throw new NotFoundException('Brief not found.');

    const updated = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.brief.update({
        where: { id: briefId },
        data: { status },
      });

      await tx.adminAction.create({
        data: {
          adminId,
          targetUserId: brief.postedByUserId,
          actionType: 'UPDATE_BRIEF_STATUS',
          notes: `Brief "${brief.title}" status changed from ${brief.status} to ${status}.`,
        },
      });

      return updated;
    });

    await this.notifications.deliver(brief.postedByUserId, {
      actorId: adminId,
      category: 'opportunities',
      type: 'brief_status_changed',
      title: 'Opportunity status changed',
      message: `An administrator changed "${brief.title}" from ${brief.status} to ${status}.`,
      link: `/opportunities/${brief.id}`,
      metadata: { briefId, previousStatus: brief.status, status },
      preference: 'opportunities',
      emailCategory: 'BRIEF_OPPORTUNITY',
    });
    await this.notifyOtherAdmins(adminId, 'Brief governance change',
      `"${brief.title}" changed from ${brief.status} to ${status}.`,
      '/admin/briefs');
    return updated;
  }

  // ─── Pitches Management ──────────────────────────────────────────────

  async getPitches(query: QueryAdminPitchesDto) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.briefId) where.briefId = query.briefId;
    if (query.status) where.status = query.status;
    if (query.search) {
      where.OR = [
        { statement: { contains: query.search, mode: 'insensitive' } },
        { brief: { title: { contains: query.search, mode: 'insensitive' } } },
        { artist: { workingName: { contains: query.search, mode: 'insensitive' } } },
      ];
    }

    const [total, pitches] = await Promise.all([
      this.prisma.pitch.count({ where }),
      this.prisma.pitch.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          brief: {
            select: {
              id: true,
              title: true,
              briefType: true,
              postedBy: {
                select: {
                  id: true,
                  role: true,
                  galleryProfile: { select: { galleryName: true } },
                  artProfessionalProfile: { select: { displayName: true } },
                  collectorProfile: { select: { displayHandle: true } },
                },
              },
            },
          },
          artist: {
            select: {
              userId: true,
              workingName: true,
              photoUrl: true,
              careerStage: true,
              city: true,
              country: true,
            },
          },
          portfolioItems: {
            include: {
              portfolioItem: true,
            },
          },
        },
      }),
    ]);

    return {
      data: pitches.map((p) => {
        let posterName = 'Creator';
        if (p.brief.postedBy.galleryProfile) posterName = p.brief.postedBy.galleryProfile.galleryName;
        else if (p.brief.postedBy.artProfessionalProfile) posterName = p.brief.postedBy.artProfessionalProfile.displayName;
        else if (p.brief.postedBy.collectorProfile) posterName = p.brief.postedBy.collectorProfile.displayHandle;

        return {
          id: p.id,
          briefId: p.briefId,
          briefTitle: p.brief.title,
          briefType: p.brief.briefType,
          posterName,
          posterRole: p.brief.postedBy.role,
          artistId: p.artistId,
          artistName: p.artist.workingName,
          artistPhoto: p.artist.photoUrl,
          artistCareerStage: p.artist.careerStage,
          artistLocation: `${p.artist.city || ''}, ${p.artist.country || ''}`.trim(),
          statement: p.statement,
          status: p.status,
          declineReason: p.declineReason,
          declineFeedback: p.declineFeedback,
          createdAt: p.createdAt,
          submittedWorksCount: p.portfolioItems.length,
        };
      }),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ─── Requests Management ─────────────────────────────────────────────

  async getRequests(query: QueryAdminRequestsDto) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.requestType) where.requestType = query.requestType;
    if (query.status) where.status = query.status;

    const [total, requests] = await Promise.all([
      this.prisma.request.count({ where }),
      this.prisma.request.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          requester: {
            select: {
              id: true,
              role: true,
              email1: true,
              artistProfile: { select: { workingName: true } },
              galleryProfile: { select: { galleryName: true } },
              artProfessionalProfile: { select: { displayName: true } },
              collectorProfile: { select: { displayHandle: true } },
            },
          },
          recipient: {
            select: {
              id: true,
              role: true,
              email1: true,
              artistProfile: { select: { workingName: true } },
              galleryProfile: { select: { galleryName: true } },
              artProfessionalProfile: { select: { displayName: true } },
              collectorProfile: { select: { displayHandle: true } },
            },
          },
          visitRequest: true,
          pvrGrant: true,
        },
      }),
    ]);

    const getName = (u: any) => {
      if (u.artistProfile) return u.artistProfile.workingName;
      if (u.galleryProfile) return u.galleryProfile.galleryName;
      if (u.artProfessionalProfile) return u.artProfessionalProfile.displayName;
      if (u.collectorProfile) return u.collectorProfile.displayHandle;
      return u.email1.split('@')[0];
    };

    return {
      data: requests.map((r) => ({
        id: r.id,
        requesterId: r.requesterId,
        requesterName: getName(r.requester),
        requesterRole: r.requester.role,
        recipientId: r.recipientId,
        recipientName: getName(r.recipient),
        recipientRole: r.recipient.role,
        requestType: r.requestType,
        status: r.status,
        message: r.message,
        declineReason: r.declineReason,
        declineFeedback: r.declineFeedback,
        createdAt: r.createdAt,
        respondedAt: r.respondedAt,
        visit: r.visitRequest
          ? {
              status: r.visitRequest.status,
              requestedDate: r.visitRequest.requestedDate,
              confirmedDate: r.visitRequest.confirmedDate,
              location: r.visitRequest.location,
            }
          : null,
        pvrGrant: !!r.pvrGrant,
      })),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ─── Interaction Permissions Matrix ──────────────────────────────────

  async getPermissions() {
    const existing = await this.prisma.interactionPermission.findMany();
    const existingMap = new Map<string, string>();
    for (const p of existing) {
      existingMap.set(`${p.fromRole}_${p.toRole}`, p.mode);
    }

    return INTERACTION_POLICY.map((rule) => {
      const key = `${rule.fromRole}_${rule.toRole}`;
      const storedMode = existingMap.get(key) ?? null;
      return {
        ...rule,
        storedMode,
        isConfigured: storedMode !== null,
        isInSync: storedMode === rule.mode,
        isLocked: true,
      };
    });
  }

  async updatePermission(adminId: string, dto: UpdatePermissionDto) {
    const policy = getInteractionPolicy(dto.fromRole, dto.toRole);
    if (!policy) {
      throw new BadRequestException('This role pair is not part of the participant interaction matrix.');
    }
    if (dto.mode !== policy.mode) {
      throw new BadRequestException(
        `This requirement-level rule is locked to ${policy.mode}.`,
      );
    }

    const updated = await this.prisma.interactionPermission.upsert({
      where: {
        fromRole_toRole: {
          fromRole: dto.fromRole,
          toRole: dto.toRole,
        },
      },
      create: {
        fromRole: dto.fromRole,
        toRole: dto.toRole,
        mode: dto.mode,
      },
      update: {
        mode: dto.mode,
      },
    });

    await this.prisma.adminAction.create({
      data: {
        adminId,
        actionType: 'UPDATE_INTERACTION_PERMISSION',
        notes: `Permission rule ${dto.fromRole} -> ${dto.toRole} updated to mode: ${dto.mode}.`,
      },
    });

    await this.notifyOtherAdmins(adminId, 'Interaction permission synchronized',
      `${dto.fromRole} to ${dto.toRole} is set to ${dto.mode}.`,
      '/admin/permissions');

    return updated;
  }

  private async notifyOtherAdmins(actorId: string, title: string, message: string, link: string) {
    const admins = await this.prisma.user.findMany({
      where: { role: 'admin', status: 'active', id: { not: actorId } },
      select: { id: true },
    });
    await Promise.all(admins.map((admin) => this.notifications.deliver(admin.id, {
      actorId,
      category: 'system',
      type: 'governance_changed',
      title,
      message,
      link,
      preference: 'governance',
      emailCategory: 'SYSTEM',
    })));
  }

  // ─── Admin Activity Log ──────────────────────────────────────────────

  async getActivity(query: QueryActivityDto) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.actionType) where.actionType = query.actionType;
    if (query.search) {
      where.OR = [
        { actionType: { contains: query.search, mode: 'insensitive' } },
        { notes: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [total, actions] = await Promise.all([
      this.prisma.adminAction.count({ where }),
      this.prisma.adminAction.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          admin: { select: { email1: true } },
          targetUser: { select: { email1: true, role: true } },
        },
      }),
    ]);

    return {
      data: actions.map((a) => ({
        id: a.id,
        adminId: a.adminId,
        adminEmail: a.admin.email1,
        actionType: a.actionType,
        targetUserId: a.targetUserId,
        targetUserEmail: a.targetUser?.email1 || null,
        targetUserRole: a.targetUser?.role || null,
        notes: a.notes,
        createdAt: a.createdAt,
      })),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ─── Requests & Visits 30-Day Reporting KPI Detail ────────────────────

  async getRequestsKpis() {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [total30d, accepted30d, declined30d, byType, byRequesterRole] = await Promise.all([
      this.prisma.request.count({
        where: { createdAt: { gte: thirtyDaysAgo } },
      }),
      this.prisma.request.count({
        where: { createdAt: { gte: thirtyDaysAgo }, status: 'accepted' },
      }),
      this.prisma.request.count({
        where: { createdAt: { gte: thirtyDaysAgo }, status: 'declined' },
      }),
      this.prisma.request.groupBy({
        by: ['requestType', 'status'],
        where: { createdAt: { gte: thirtyDaysAgo } },
        _count: { id: true },
      }),
      this.prisma.request.groupBy({
        by: ['requesterId'],
        where: { createdAt: { gte: thirtyDaysAgo } },
        _count: { id: true },
      }),
    ]);

    return {
      summary30d: {
        total: total30d,
        accepted: accepted30d,
        declined: declined30d,
        pending: total30d - accepted30d - declined30d,
      },
      byTypeBreakdown: byType,
    };
  }
}
