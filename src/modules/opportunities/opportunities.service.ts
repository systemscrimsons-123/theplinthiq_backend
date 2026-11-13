import {
  Injectable, NotFoundException, ForbiddenException,
  UnprocessableEntityException, ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateBriefDto, UpdateBriefDto, SubmitPitchDto } from './dto/opportunity.dto';
import { BriefType, BriefStatus, PitchStatus } from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class OpportunitiesService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  // ─── List briefs (public) ────────────────────────────────────────────
  async listBriefs(query: {
    briefType?: BriefType;
    status?: BriefStatus;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(Math.max(1, Number(query.limit) || 20), 50);
    const skip = (page - 1) * limit;

    const where: any = {
      status: query.status ?? 'published',
      postedBy: { status: 'active' },
    };
    if (query.briefType) where.briefType = query.briefType;
    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
        { opportunityType: { contains: query.search, mode: 'insensitive' } },
        { exhibitionTheme: { contains: query.search, mode: 'insensitive' } },
        { location: { contains: query.search, mode: 'insensitive' } },
        { artistRequirements: { contains: query.search, mode: 'insensitive' } },
        {
          mediums: {
            some: {
              medium: {
                label: { contains: query.search, mode: 'insensitive' },
              },
            },
          },
        },
      ];
    }

    const [briefs, total] = await this.prisma.$transaction([
      this.prisma.brief.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          postedBy: {
            select: {
              role: true,
              galleryProfile: { select: { galleryName: true, logoUrl: true } },
              artProfessionalProfile: { select: { displayName: true, organisation: true } },
              collectorProfile: { select: { displayHandle: true } },
            },
          },
          mediums: { include: { medium: { select: { label: true } } } },
          images: { orderBy: { sortOrder: 'asc' }, take: 1 },
          _count: { select: { pitches: true } },
        },
      }),
      this.prisma.brief.count({ where }),
    ]);

    return {
      data: briefs,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  // ─── Get brief detail ────────────────────────────────────────────────
  async getBrief(briefId: string) {
    const brief = await this.prisma.brief.findUnique({
      where: { id: briefId },
      include: {
        postedBy: {
          select: {
            role: true,
            galleryProfile: { select: { galleryName: true, logoUrl: true, websiteUrl: true } },
            artProfessionalProfile: { select: { displayName: true, organisation: true, photoUrl: true } },
            collectorProfile: { select: { displayHandle: true, city: true, country: true } },
          },
        },
        mediums: { include: { medium: true } },
        images: { orderBy: { sortOrder: 'asc' } },
        _count: { select: { pitches: true } },
      },
    });
    if (!brief) throw new NotFoundException('Opportunity not found.');
    return brief;
  }

  // ─── Create brief ────────────────────────────────────────────────────
  async createBrief(userId: string, dto: CreateBriefDto) {
    await this.validateBriefOwnershipScope(userId, dto.briefType, dto.opportunityType);
    const { mediumIds, imageUrls, submissionDeadline, eventStartDate, eventEndDate, ...data } = dto;

    // DB trigger validates poster role vs brief_type
    const brief = await this.prisma.brief.create({
      data: {
        postedByUserId: userId,
        ...data,
        submissionDeadline: submissionDeadline ? new Date(submissionDeadline) : null,
        eventStartDate: eventStartDate ? new Date(eventStartDate) : null,
        eventEndDate: eventEndDate ? new Date(eventEndDate) : null,
      },
    });

    if (mediumIds?.length) {
      await this.prisma.briefMedium.createMany({
        data: mediumIds.map((mediumId) => ({ briefId: brief.id, mediumId })),
        skipDuplicates: true,
      });
    }
    if (imageUrls?.length) {
      await this.prisma.briefImage.createMany({
        data: imageUrls.map((imageUrl, i) => ({ briefId: brief.id, imageUrl, sortOrder: i })),
      });
    }

    return this.getBrief(brief.id);
  }

  // ─── Update brief ─────────────────────────────────────────────────────
  async updateBrief(userId: string, briefId: string, dto: UpdateBriefDto) {
    const brief = await this.prisma.brief.findUnique({ where: { id: briefId } });
    if (!brief) throw new NotFoundException('Opportunity not found.');
    if (brief.postedByUserId !== userId) throw new ForbiddenException('Not your opportunity.');
    await this.validateBriefOwnershipScope(
      userId,
      dto.briefType ?? brief.briefType,
      dto.opportunityType,
    );

    const { mediumIds, imageUrls, submissionDeadline, eventStartDate, eventEndDate, ...data } = dto;

    await this.prisma.brief.update({
      where: { id: briefId },
      data: {
        ...data,
        submissionDeadline: submissionDeadline ? new Date(submissionDeadline) : undefined,
        eventStartDate: eventStartDate ? new Date(eventStartDate) : undefined,
        eventEndDate: eventEndDate ? new Date(eventEndDate) : undefined,
      },
    });

    if (imageUrls !== undefined) {
      await this.prisma.briefImage.deleteMany({ where: { briefId } });
      if (imageUrls.length) {
        await this.prisma.briefImage.createMany({
          data: imageUrls.map((imageUrl, i) => ({ briefId, imageUrl, sortOrder: i })),
        });
      }
    }

    if (mediumIds !== undefined) {
      await this.prisma.briefMedium.deleteMany({ where: { briefId } });
      if (mediumIds.length) {
        await this.prisma.briefMedium.createMany({
          data: mediumIds.map((mediumId) => ({ briefId, mediumId })),
          skipDuplicates: true,
        });
      }
    }

    return this.getBrief(briefId);
  }

  // ─── Delete brief ─────────────────────────────────────────────────────
  async deleteBrief(userId: string, briefId: string) {
    const brief = await this.prisma.brief.findUnique({ where: { id: briefId } });
    if (!brief) throw new NotFoundException('Opportunity not found.');
    if (brief.postedByUserId !== userId) throw new ForbiddenException('Not your opportunity.');

    await this.prisma.brief.delete({ where: { id: briefId } });
    return { message: 'Opportunity deleted successfully.' };
  }

  // ─── My posted opportunities ──────────────────────────────────────────
  async myBriefs(userId: string) {
    return this.prisma.brief.findMany({
      where: { postedByUserId: userId },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { pitches: true } },
        images: { take: 1, orderBy: { sortOrder: 'asc' } },
        pitches: {
          select: {
            id: true,
            status: true,
          },
        },
      },
    });
  }

  // ─── Submit or Save Draft pitch ─────────────────────────────────────
  async submitPitch(artistId: string, briefId: string, dto: SubmitPitchDto) {
    const brief = await this.prisma.brief.findUnique({ where: { id: briefId } });
    if (!brief) throw new NotFoundException('Opportunity not found.');
    if (brief.status !== 'published') throw new ForbiddenException('This opportunity is not accepting pitches.');
    if (brief.postedByUserId === artistId) {
      throw new ForbiddenException('You cannot pitch to your own opportunity.');
    }
    if (!dto.statement?.trim()) {
      throw new UnprocessableEntityException('Pitch statement is required.');
    }

    const existing = await this.prisma.pitch.findUnique({
      where: { briefId_artistId: { briefId, artistId } },
    });

    if (dto.isDraft) {
      if (existing && existing.status !== 'saved') {
        throw new ConflictException('You have already submitted an official pitch for this opportunity.');
      }

      let draftPitch: any;
      if (existing) {
        draftPitch = await this.prisma.pitch.update({
          where: { id: existing.id },
          data: {
            statement: dto.statement,
            status: 'saved',
          },
        });
      } else {
        draftPitch = await this.prisma.pitch.create({
          data: {
            briefId,
            artistId,
            statement: dto.statement,
            status: 'saved',
          },
        });
      }

      if (dto.portfolioItemIds !== undefined) {
        await this.prisma.pitchPortfolioItem.deleteMany({ where: { pitchId: draftPitch.id } });
        if (dto.portfolioItemIds.length) {
          await this.prisma.pitchPortfolioItem.createMany({
            data: dto.portfolioItemIds.map((portfolioItemId) => ({
              pitchId: draftPitch.id,
              portfolioItemId,
            })),
            skipDuplicates: true,
          });
        }
      }

      return draftPitch;
    }

    // Official submission
    if (existing && existing.status !== 'saved') {
      throw new ConflictException('You have already pitched for this opportunity.');
    }

    // Atomically consume monthly allowance
    await this.prisma.$executeRaw`SELECT consume_pitch_allowance(${artistId}::uuid)`;

    let pitch: any;
    if (existing && existing.status === 'saved') {
      pitch = await this.prisma.pitch.update({
        where: { id: existing.id },
        data: {
          statement: dto.statement,
          status: 'submitted',
        },
      });
    } else {
      pitch = await this.prisma.pitch.create({
        data: {
          briefId,
          artistId,
          statement: dto.statement,
          status: 'submitted',
        },
      });
    }

    if (dto.portfolioItemIds !== undefined) {
      await this.prisma.pitchPortfolioItem.deleteMany({ where: { pitchId: pitch.id } });
      if (dto.portfolioItemIds.length) {
        await this.prisma.pitchPortfolioItem.createMany({
          data: dto.portfolioItemIds.map((portfolioItemId) => ({
            pitchId: pitch.id,
            portfolioItemId,
          })),
          skipDuplicates: true,
        });
      }
    }

    const destination = brief.briefType === 'gallery_open_call'
      ? '/galleries/pitch-queue'
      : brief.briefType === 'curatorial_brief'
        ? '/art-professionals/curatorial-briefs'
        : `/collectors/patronage-briefs/${brief.id}/proposals`;

    await this.notifications.deliver(brief.postedByUserId, {
      actorId: artistId,
      category: 'opportunities',
      type: 'pitch_received',
      title: 'New pitch received',
      message: `An artist submitted a pitch for "${brief.title}".`,
      link: destination,
      metadata: { briefId, pitchId: pitch.id },
      preference: 'opportunities',
      emailCategory: 'PITCH_SUBMISSION',
    });

    return pitch;
  }

  // ─── Withdraw pitch (artist) ──────────────────────────────────────────
  async withdrawPitch(userId: string, pitchId: string) {
    const pitch = await this.prisma.pitch.findUnique({ where: { id: pitchId } });
    if (!pitch) throw new NotFoundException('Pitch not found.');
    if (pitch.artistId !== userId) throw new ForbiddenException('Not your pitch.');

    if (pitch.status === 'saved') {
      await this.prisma.pitch.delete({ where: { id: pitchId } });
      return { message: 'Draft pitch discarded successfully.' };
    }

    const updated = await this.prisma.pitch.update({
      where: { id: pitchId },
      data: {
        status: 'declined',
        declineReason: 'withdrawn_by_artist',
        declineFeedback: 'Withdrawn by artist.',
      },
    });
    return updated;
  }

  // ─── My pitches (artist) ──────────────────────────────────────────────
  async myPitches(artistId: string) {
    return this.prisma.pitch.findMany({
      where: { artistId },
      orderBy: { createdAt: 'desc' },
      include: {
        brief: {
          select: {
            id: true,
            title: true,
            briefType: true,
            submissionDeadline: true,
            location: true,
            postedBy: {
              select: {
                galleryProfile: { select: { galleryName: true } },
                artProfessionalProfile: { select: { displayName: true } },
                collectorProfile: { select: { displayHandle: true } },
              },
            },
          },
        },
        portfolioItems: {
          include: {
            portfolioItem: {
              select: {
                id: true,
                imageUrl: true,
                title: true,
                year: true,
                medium: true,
                dimensions: true,
              },
            },
          },
        },
      },
    });
  }

  // ─── Single pitch details ─────────────────────────────────────────────
  async getPitch(userId: string, pitchId: string) {
    const pitch: any = await this.prisma.pitch.findUnique({
      where: { id: pitchId },
      include: {
        brief: {
          include: {
            postedBy: {
              select: {
                id: true,
                role: true,
                verificationStatus: true,
                galleryProfile: {
                  select: {
                    galleryName: true,
                    locations: { select: { city: true, country: true } },
                    ethosStatement: true,
                    websiteUrl: true,
                    logoUrl: true,
                  },
                },
                artProfessionalProfile: {
                  select: {
                    displayName: true,
                    city: true,
                    country: true,
                    biography: true,
                    organisation: true,
                    jobTitle: true,
                  },
                },
                collectorProfile: {
                  select: {
                    displayHandle: true,
                    city: true,
                    country: true,
                  },
                },
              },
            },
            mediums: { include: { medium: true } },
          },
        },
        artist: {
          select: {
            userId: true,
            fullName: true,
            workingName: true,
            photoUrl: true,
            city: true,
            country: true,
            careerStage: true,
            artistStatement: true,
            biography: true,
            representationStatus: true,
            pitchPackage: true,
            mediums: { select: { medium: { select: { label: true } } } },
            cvEntries: { orderBy: { year: 'desc' } },
          },
        },
        portfolioItems: {
          include: {
            portfolioItem: true,
          },
        },
        statusHistory: {
          orderBy: { changedAt: 'desc' },
        },
      },
    });

    if (!pitch) throw new NotFoundException('Pitch not found.');

    // Authorization: User must be the artist who submitted, the poster of the brief, or an admin
    if (pitch.artistId !== userId && pitch.brief?.postedByUserId !== userId) {
      const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
      if (user?.role !== 'admin') {
        throw new ForbiddenException('You do not have permission to view this pitch.');
      }
    }

    return pitch;
  }

  // ─── Update curator notes on a pitch ─────────────────────────────────
  async updateCuratorNotes(userId: string, pitchId: string, notes: string) {
    const pitch = await this.prisma.pitch.findUnique({
      where: { id: pitchId },
      include: { brief: { select: { postedByUserId: true } } },
    });
    if (!pitch) throw new NotFoundException('Pitch not found.');
    if (pitch.brief.postedByUserId !== userId) throw new ForbiddenException('Not your brief.');

    return this.prisma.pitch.update({
      where: { id: pitchId },
      data: { curatorNotes: notes },
      select: { id: true, curatorNotes: true },
    });
  }


  // ─── All pitches received across all my briefs ─────────────────────────
  async myReceivedPitches(
    userId: string,
    filter?: { status?: PitchStatus; briefId?: string; search?: string },
  ) {
    const where: any = {
      brief: { postedByUserId: userId },
      // 'saved' means artist draft — not yet submitted, gallery should never see these
      status: { not: 'saved' as PitchStatus },
    };

    if (filter?.status) {
      // Explicit status filter overrides the base filter
      where.status = filter.status;
    }


    if (filter?.briefId) {
      where.briefId = filter.briefId;
    }

    if (filter?.search) {
      where.OR = [
        { statement: { contains: filter.search, mode: 'insensitive' } },
        { brief: { title: { contains: filter.search, mode: 'insensitive' } } },
        {
          artist: {
            OR: [
              { workingName: { contains: filter.search, mode: 'insensitive' } },
              { fullName: { contains: filter.search, mode: 'insensitive' } },
              { city: { contains: filter.search, mode: 'insensitive' } },
            ],
          },
        },
      ];
    }

    return this.prisma.pitch.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        brief: {
          select: {
            id: true,
            title: true,
            briefType: true,
            opportunityType: true,
            submissionDeadline: true,
          },
        },
        artist: {
          select: {
            userId: true,
            fullName: true,
            workingName: true,
            photoUrl: true,
            city: true,
            country: true,
            careerStage: true,
            artistStatement: true,
            pitchPackage: true,
            mediums: { select: { medium: { select: { label: true } } } },
          },
        },
        portfolioItems: { include: { portfolioItem: true } },
        statusHistory: { orderBy: { changedAt: 'desc' } },
      },
    });
  }

  // ─── Pitches received (for brief poster) ─────────────────────────────
  async pitchesForBrief(userId: string, briefId: string) {
    const brief = await this.prisma.brief.findUnique({ where: { id: briefId } });
    if (!brief) throw new NotFoundException('Opportunity not found.');
    if (brief.postedByUserId !== userId) throw new ForbiddenException('Not your opportunity.');

    return this.prisma.pitch.findMany({
      where: { briefId },
      orderBy: { createdAt: 'desc' },
      include: {
        brief: {
          select: {
            id: true,
            title: true,
            opportunityType: true,
          },
        },
        artist: {
          select: {
            userId: true,
            fullName: true,
            workingName: true,
            photoUrl: true,
            city: true,
            country: true,
            careerStage: true,
            artistStatement: true,
            pitchPackage: true,
            mediums: { select: { medium: { select: { label: true } } } },
          },
        },
        portfolioItems: { include: { portfolioItem: true } },
        statusHistory: { orderBy: { changedAt: 'desc' } },
      },
    });
  }

  // ─── Update pitch status (brief poster) ──────────────────────────────
  async updatePitchStatus(
    userId: string,
    pitchId: string,
    status: PitchStatus,
    declineFeedback?: string,
  ) {
    const pitch = await this.prisma.pitch.findUnique({
      where: { id: pitchId },
      include: { brief: true },
    });
    if (!pitch) throw new NotFoundException('Pitch not found.');
    if (pitch.brief.postedByUserId !== userId) throw new ForbiddenException('Not your brief.');
    if (status === 'declined' && (!declineFeedback || declineFeedback.trim().length < 5)) {
      throw new UnprocessableEntityException('Meaningful decline feedback is required when declining a pitch.');
    }

    const updated = await this.prisma.pitch.update({
      where: { id: pitchId },
      data: { status, declineFeedback: declineFeedback ?? null },
      include: {
        brief: true,
        artist: true,
        portfolioItems: { include: { portfolioItem: true } },
        statusHistory: { orderBy: { changedAt: 'desc' } },
      },
    });

    await this.prisma.pitchStatusHistory.create({
      data: {
        pitchId,
        fromStatus: pitch.status,
        toStatus: status,
        changedBy: userId,
        note: declineFeedback ?? `Status changed to ${status}.`,
      },
    }).catch(() => {});

    const statusLabel = status.replace(/_/g, ' ');
    await this.notifications.deliver(pitch.artistId, {
      actorId: userId,
      category: 'opportunities',
      type: 'pitch_status_changed',
      title: `Pitch ${statusLabel}`,
      message: status === 'declined'
        ? `Your pitch for "${pitch.brief.title}" was declined. Feedback: ${declineFeedback}`
        : `Your pitch for "${pitch.brief.title}" is now ${statusLabel}.`,
      link: `/artists/my-pitches/${pitch.id}`,
      metadata: { briefId: pitch.briefId, pitchId, status },
      preference: 'opportunities',
      emailCategory: 'PITCH_STATUS_UPDATE',
    });

    return updated;
  }

  private async validateBriefOwnershipScope(
    userId: string,
    briefType: BriefType,
    opportunityType?: string,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    if (!user) throw new NotFoundException('User not found.');

    const allowedByRole: Record<string, BriefType> = {
      gallery: 'gallery_open_call',
      art_professional: 'curatorial_brief',
      collector: 'patronage_brief',
    };

    if (allowedByRole[user.role] !== briefType) {
      throw new ForbiddenException(
        `${user.role.replace('_', ' ')} accounts can only publish ${allowedByRole[user.role] || 'scoped'} briefs.`,
      );
    }

    if (user.role === 'collector' && opportunityType) {
      const permittedPatronageTypes = [
        'Residency Space',
        'Public Installation Funding',
        'Private Pop-Up Exhibition',
      ];
      if (!permittedPatronageTypes.includes(opportunityType)) {
        throw new UnprocessableEntityException(
          'Collector briefs must be non-commercial patronage opportunities.',
        );
      }
    }
  }
}
