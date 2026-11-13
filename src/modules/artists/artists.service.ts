import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  UpsertArtistProfileDto,
  AddAestheticDto,
  AddPortfolioItemDto,
  UpdatePortfolioItemDto,
  AddCvEntryDto,
  QueryArtistsDto,
} from './dto/artist.dto';
import { CareerStage, RepresentationStatus, ScaleRange, PlatformIntent } from '@prisma/client';

@Injectable()
export class ArtistsService {
  constructor(private prisma: PrismaService) {}

  // ─── Public: Get any artist's public profile ─────────────────────────
  async getPublicProfile(userId: string) {
    const profile = await this.prisma.artistProfile.findUnique({
      where: { userId },
      include: {
        user: { select: { verificationStatus: true, status: true } },
        mediums: { include: { medium: true } },
        aesthetics: { include: { aesthetic: true } },
        scaleRanges: true,
        platformIntents: true,
        cvEntries: { orderBy: { year: 'desc' } },
        portfolioItems: {
          where: { isPublic: true },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    if (!profile) throw new NotFoundException('Artist profile not found.');
    return profile;
  }

  // ─── Upsert my profile ───────────────────────────────────────────────
  async upsertMyProfile(userId: string, dto: UpsertArtistProfileDto) {
    const {
      fullName,
      workingName,
      bannerUrl,
      careerStage,
      representationStatus,
      mediumIds,
      mediums,
      materialTags,
      scaleRanges,
      aesthetics,
      platformIntents,
      platformIntentOther,
      contactEmail1,
      contactEmail2,
      contactPhone1,
      contactPhone2,
      ...profileData
    } = dto;

    const normalizeCareerStage = (val?: string): CareerStage | undefined => {
      if (!val) return undefined;
      const s = val.toLowerCase().replace(/[^a-z]/g, '');
      if (s === 'emerging') return CareerStage.emerging;
      if (s === 'midcareer' || s === 'mid_career') return CareerStage.mid_career;
      if (s === 'established') return CareerStage.established;
      return undefined;
    };

    const normalizeRepresentationStatus = (val?: string): RepresentationStatus | undefined => {
      if (!val) return undefined;
      const s = val.toLowerCase();
      if (s.includes('unrepresented') || s.includes('not represented') || s.includes('seeking')) {
        return RepresentationStatus.unrepresented_seeking;
      }
      if (s.includes('non_exclusive') || s.includes('non-exclusive')) {
        return RepresentationStatus.represented_non_exclusive;
      }
      if (s.includes('fully') || s.includes('represented')) {
        return RepresentationStatus.fully_represented;
      }
      return undefined;
    };

    const normalizeScaleRange = (val: string): ScaleRange | null => {
      if (!val) return null;
      const s = val.toLowerCase().trim();
      // Check large first so 'over 60' or 'monumental' never conflicts with medium
      if (
        s.includes('large') ||
        s.includes('monumental') ||
        s.includes('over 60') ||
        s.includes('> 60') ||
        s.includes('> 120') ||
        s.includes('120') ||
        s === 'large'
      ) {
        return ScaleRange.large;
      }
      // Check small next
      if (
        s.includes('small') ||
        s.includes('under 24') ||
        s.includes('< 24') ||
        s === 'small'
      ) {
        return ScaleRange.small;
      }
      // Check medium
      if (
        s.includes('medium') ||
        s.includes('24 – 60') ||
        s.includes('24 - 60') ||
        s.includes('24 to 60') ||
        s === 'medium'
      ) {
        return ScaleRange.medium;
      }
      return null;
    };

    const normalizePlatformIntent = (val: string): PlatformIntent => {
      const s = val.toLowerCase().replace(/[^a-z]/g, '_');
      if (s.includes('gallery') || s.includes('representation')) return PlatformIntent.open_to_gallery_representation;
      if (s.includes('group_show') || s.includes('shows')) return PlatformIntent.seeking_group_shows;
      if (s.includes('residency') || s.includes('residencies')) return PlatformIntent.seeking_residencies;
      if (s.includes('collector') || s.includes('visit')) return PlatformIntent.open_to_collector_visits;
      return PlatformIntent.other;
    };

    const parsedCareerStage = normalizeCareerStage(careerStage);
    const parsedRepresentationStatus = normalizeRepresentationStatus(representationStatus);

    const updatePayload: any = {
      ...profileData,
    };
    if (fullName !== undefined) updatePayload.fullName = fullName;
    if (workingName !== undefined) updatePayload.workingName = workingName || fullName;
    if (bannerUrl !== undefined) updatePayload.bannerUrl = bannerUrl;
    if (parsedCareerStage !== undefined) updatePayload.careerStage = parsedCareerStage;
    if (parsedRepresentationStatus !== undefined) updatePayload.representationStatus = parsedRepresentationStatus;

    await this.prisma.artistProfile.upsert({
      where: { userId },
      create: {
        userId,
        workingName: workingName || fullName || 'Artist',
        ...updatePayload,
      },
      update: updatePayload,
    });

    // Sync user contact information (email1, email2, phone1, phone2)
    const userContactUpdates: any = {};
    if (contactEmail2 !== undefined) userContactUpdates.email2 = contactEmail2;
    if (contactPhone1 !== undefined) userContactUpdates.phone1 = contactPhone1;
    if (contactPhone2 !== undefined) userContactUpdates.phone2 = contactPhone2;
    if (Object.keys(userContactUpdates).length > 0) {
      await this.prisma.user.update({
        where: { id: userId },
        data: userContactUpdates,
      });
    }

    // Sync mediums (either through mediums labels or mediumIds)
    if (mediums !== undefined || mediumIds !== undefined) {
      await this.prisma.artistMedium.deleteMany({ where: { artistId: userId } });
      const targetMediumIds = new Set<string>(mediumIds || []);

      if (mediums && mediums.length > 0) {
        for (const mLabel of mediums) {
          if (!mLabel || !mLabel.trim()) continue;
          let term = await this.prisma.taxonomyTerm.findUnique({
            where: { category_label: { category: 'medium', label: mLabel.trim() } },
          });
          if (!term) {
            term = await this.prisma.taxonomyTerm.create({
              data: { category: 'medium', label: mLabel.trim() },
            });
          }
          targetMediumIds.add(term.id);
        }
      }

      if (targetMediumIds.size > 0) {
        await this.prisma.artistMedium.createMany({
          data: Array.from(targetMediumIds).map((mId) => ({ artistId: userId, mediumId: mId })),
          skipDuplicates: true,
        });
      }
    }

    // Sync material tags
    if (materialTags !== undefined) {
      await this.prisma.artistMaterialTag.deleteMany({ where: { artistId: userId } });
      const validTags = materialTags.filter((t) => t && t.trim());
      if (validTags.length > 0) {
        await this.prisma.artistMaterialTag.createMany({
          data: validTags.map((tag) => ({ artistId: userId, tag: tag.trim() })),
          skipDuplicates: true,
        });
      }
    }

    // Sync scale ranges
    if (scaleRanges !== undefined) {
      await this.prisma.artistScaleRange.deleteMany({ where: { artistId: userId } });
      const parsedScales = scaleRanges
        .map(normalizeScaleRange)
        .filter((s): s is ScaleRange => s !== null);

      if (parsedScales.length > 0) {
        await this.prisma.artistScaleRange.createMany({
          data: Array.from(new Set(parsedScales)).map((scale) => ({ artistId: userId, scale })),
          skipDuplicates: true,
        });
      }
    }

    // Sync aesthetics / conceptual alignment
    if (aesthetics !== undefined) {
      await this.prisma.artistAesthetic.deleteMany({ where: { artistId: userId } });
      for (const aes of aesthetics) {
        if (!aes || !aes.trim()) continue;
        const term = await this.prisma.taxonomyTerm.findUnique({
          where: { category_label: { category: 'aesthetic', label: aes.trim() } },
        });
        if (term) {
          await this.prisma.artistAesthetic.create({
            data: { artistId: userId, aestheticId: term.id },
          });
        } else {
          await this.prisma.artistAesthetic.create({
            data: { artistId: userId, customLabel: aes.trim() },
          });
        }
      }
    }

    // Sync platform intents
    if (platformIntents !== undefined) {
      await this.prisma.artistPlatformIntent.deleteMany({ where: { artistId: userId } });
      const parsedIntents = platformIntents
        .map(normalizePlatformIntent)
        .filter(Boolean);

      if (parsedIntents.length > 0) {
        await this.prisma.artistPlatformIntent.createMany({
          data: Array.from(new Set(parsedIntents)).map((intent) => ({
            artistId: userId,
            intent,
            otherText: intent === PlatformIntent.other ? platformIntentOther : undefined,
          })),
          skipDuplicates: true,
        });
      }
    }

    return this.getMyProfile(userId);
  }

  // ─── Get my full profile (owner view) ───────────────────────────────
  async getMyProfile(userId: string) {
    const profile = await this.prisma.artistProfile.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            email1: true,
            email2: true,
            phone1: true,
            phone2: true,
            status: true,
            verificationStatus: true,
          },
        },
        mediums: { include: { medium: true } },
        materialTags: true,
        scaleRanges: true,
        aesthetics: { include: { aesthetic: true } },
        platformIntents: true,
        cvEntries: { orderBy: { year: 'desc' } },
        portfolioItems: {
          orderBy: { sortOrder: 'asc' },
          include: { pvrGrantItems: true },
        },
        pitchAllowances: {
          where: {
            periodStart: { lte: new Date() },
            periodEnd: { gte: new Date() },
          },
          take: 1,
        },
      },
    });

    if (!profile) return null;

    return {
      ...profile,
      contactEmail1: profile.user?.email1,
      contactEmail2: profile.user?.email2,
      contactPhone1: profile.user?.phone1,
      contactPhone2: profile.user?.phone2,
    };
  }

  // ─── Aesthetics ──────────────────────────────────────────────────────
  async addAesthetic(userId: string, dto: AddAestheticDto) {
    if (!dto.aestheticId && !dto.customLabel) {
      throw new BadRequestException('Either aestheticId or customLabel is required.');
    }
    if (dto.aestheticId && dto.customLabel) {
      throw new BadRequestException('Provide either aestheticId or customLabel, not both.');
    }

    // DB trigger enforces the 10-item max — if it fails, our exception filter catches it
    return this.prisma.artistAesthetic.create({
      data: {
        artistId: userId,
        aestheticId: dto.aestheticId ?? null,
        customLabel: dto.customLabel ?? null,
      },
    });
  }

  async removeAesthetic(userId: string, aestheticRecordId: string) {
    const record = await this.prisma.artistAesthetic.findUnique({
      where: { id: aestheticRecordId },
    });
    if (!record || record.artistId !== userId) throw new NotFoundException('Aesthetic not found.');
    return this.prisma.artistAesthetic.delete({ where: { id: aestheticRecordId } });
  }

  // ─── Portfolio ───────────────────────────────────────────────────────
  async addPortfolioItem(userId: string, dto: AddPortfolioItemDto) {
    const profile = await this.prisma.artistProfile.findUnique({ where: { userId } });
    if (!profile) throw new NotFoundException('Artist profile not found. Create your profile first.');

    // DB trigger enforces 10-item public limit
    return this.prisma.portfolioItem.create({
      data: { artistId: userId, ...dto },
    });
  }

  async updatePortfolioItem(userId: string, itemId: string, dto: UpdatePortfolioItemDto) {
    const item = await this.prisma.portfolioItem.findUnique({ where: { id: itemId } });
    if (!item || item.artistId !== userId) throw new NotFoundException('Portfolio item not found.');
    return this.prisma.portfolioItem.update({ where: { id: itemId }, data: dto });
  }

  async deletePortfolioItem(userId: string, itemId: string) {
    const item = await this.prisma.portfolioItem.findUnique({ where: { id: itemId } });
    if (!item || item.artistId !== userId) throw new NotFoundException('Portfolio item not found.');
    return this.prisma.portfolioItem.delete({ where: { id: itemId } });
  }

  async reorderPortfolioItems(userId: string, orderedIds: string[]) {
    const updates = orderedIds.map((id, index) =>
      this.prisma.portfolioItem.updateMany({
        where: { id, artistId: userId },
        data: { sortOrder: index },
      }),
    );
    await this.prisma.$transaction(updates);
    return { message: 'Portfolio order updated.' };
  }

  // ─── CV Entries ──────────────────────────────────────────────────────
  async addCvEntry(userId: string, dto: AddCvEntryDto) {
    // Ensure profile exists
    const profile = await this.prisma.artistProfile.findUnique({ where: { userId } });
    if (!profile) throw new NotFoundException('Artist profile not found. Create your profile first.');

    return this.prisma.artistCvEntry.create({ data: { artistId: userId, ...dto } });
  }

  async updateCvEntry(userId: string, entryId: string, dto: AddCvEntryDto) {
    const entry = await this.prisma.artistCvEntry.findUnique({ where: { id: entryId } });
    if (!entry || entry.artistId !== userId) throw new NotFoundException('CV entry not found.');
    return this.prisma.artistCvEntry.update({ where: { id: entryId }, data: dto });
  }

  async deleteCvEntry(userId: string, entryId: string) {
    const entry = await this.prisma.artistCvEntry.findUnique({ where: { id: entryId } });
    if (!entry || entry.artistId !== userId) throw new NotFoundException('CV entry not found.');
    return this.prisma.artistCvEntry.delete({ where: { id: entryId } });
  }

  // ─── Discovery ───────────────────────────────────────────────────────
  async listArtists(query: QueryArtistsDto) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(Math.max(1, Number(query.limit) || 20), 50);
    const skip = (page - 1) * limit;

    const where: any = { user: { status: 'active' } };

    if (query.careerStage) where.careerStage = query.careerStage;
    if (query.country) where.country = { contains: query.country, mode: 'insensitive' };
    if (query.search) {
      where.OR = [
        { workingName: { contains: query.search, mode: 'insensitive' } },
        { city: { contains: query.search, mode: 'insensitive' } },
        { country: { contains: query.search, mode: 'insensitive' } },
        { biography: { contains: query.search, mode: 'insensitive' } },
        { artistStatement: { contains: query.search, mode: 'insensitive' } },
        { mediums: { some: { medium: { label: { contains: query.search, mode: 'insensitive' } } } } },
        { aesthetics: { some: { aesthetic: { label: { contains: query.search, mode: 'insensitive' } } } } },
        { materialTags: { some: { tag: { contains: query.search, mode: 'insensitive' } } } },
      ];
    }
    if (query.medium) {
      where.mediums = { some: { medium: { label: { contains: query.medium, mode: 'insensitive' } } } };
    }

    const [artists, total] = await this.prisma.$transaction([
      this.prisma.artistProfile.findMany({
        where,
        skip,
        take: limit,
        select: {
          userId: true,
          workingName: true,
          photoUrl: true,
          city: true,
          country: true,
          careerStage: true,
          representationStatus: true,
          user: { select: { verificationStatus: true } },
          mediums: { select: { medium: { select: { label: true } } } },
          aesthetics: { select: { aesthetic: { select: { label: true } } } },
          scaleRanges: { select: { scale: true } },
          platformIntents: { select: { intent: true } },
          portfolioItems: {
            where: { isPublic: true },
            select: { imageUrl: true },
            take: 1,
            orderBy: { sortOrder: 'asc' },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.artistProfile.count({ where }),
    ]);

    return {
      data: artists,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  // ─── Private Viewing Room (PVR) Works ─────────────────────────────
  async getPvrWorks(artistId: string, viewerId: string) {
    const artist = await this.prisma.artistProfile.findUnique({
      where: { userId: artistId },
    });
    if (!artist) {
      throw new NotFoundException('Artist profile not found.');
    }

    // 1. The artist themselves can view their private works
    if (viewerId === artistId) {
      return this.prisma.portfolioItem.findMany({
        where: { artistId, isPublic: false },
        orderBy: { sortOrder: 'asc' },
      });
    }

    // 2. Admin can view
    const viewer = await this.prisma.user.findUnique({ where: { id: viewerId } });
    if (viewer?.role === 'admin') {
      return this.prisma.portfolioItem.findMany({
        where: { artistId, isPublic: false },
        orderBy: { sortOrder: 'asc' },
      });
    }

    // 3. User with an accepted, active PvrAccessGrant
    const activeGrant = await this.prisma.pvrAccessGrant.findFirst({
      where: {
        request: {
          requesterId: viewerId,
          recipientId: artistId,
          requestType: 'pvr',
          status: 'accepted',
        },
        revokedAt: null,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } },
        ],
      },
    });

    if (!activeGrant) {
      throw new ForbiddenException(
        'PVR access required. You must submit a PVR request and receive approval from the artist to view private works.',
      );
    }

    return this.prisma.portfolioItem.findMany({
      where: { artistId, isPublic: false },
      orderBy: { sortOrder: 'asc' },
    });
  }
}
