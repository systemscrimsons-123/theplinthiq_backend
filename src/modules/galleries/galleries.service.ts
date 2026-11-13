import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  UpdateGalleryProfileDto,
  AddRosterArtistDto,
  UpdateRosterStatusDto,
  CreateExhibitionDto,
  UpdateExhibitionDto,
  QueryGalleriesDto,
} from './dto/gallery.dto';

@Injectable()
export class GalleriesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * List/search galleries with filters and pagination
   */
  async listGalleries(query: QueryGalleriesDto) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const where: any = { user: { status: 'active' } };

    if (query.spaceType) {
      where.spaceType = query.spaceType;
    }

    if (query.openCallStatus) {
      where.openCallStatus = query.openCallStatus;
    }

    if (query.city || query.country) {
      where.locations = {
        some: {
          ...(query.city ? { city: { contains: query.city, mode: 'insensitive' } } : {}),
          ...(query.country ? { country: { contains: query.country, mode: 'insensitive' } } : {}),
        },
      };
    }

    if (query.medium?.length) {
      where.mediums = {
        some: {
          medium: {
            OR: query.medium.map((label) => ({
              label: { equals: label, mode: 'insensitive' },
            })),
          },
        },
      };
    }

    if (query.targetCareerStage) {
      where.targetStages = {
        some: { careerStage: query.targetCareerStage },
      };
    }

    if (query.search) {
      where.OR = [
        { galleryName: { contains: query.search, mode: 'insensitive' } },
        { ethosStatement: { contains: query.search, mode: 'insensitive' } },
        { directorName: { contains: query.search, mode: 'insensitive' } },
        {
          mediums: {
            some: {
              medium: {
                label: { contains: query.search, mode: 'insensitive' },
              },
            },
          },
        },
        {
          locations: {
            some: {
              OR: [
                { city: { contains: query.search, mode: 'insensitive' } },
                { country: { contains: query.search, mode: 'insensitive' } },
              ],
            },
          },
        },
      ];
    }

    const [total, items, locationOptions] = await Promise.all([
      this.prisma.galleryProfile.count({ where }),
      this.prisma.galleryProfile.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          locations: {
            where: { isPrimary: true },
            take: 1,
          },
          mediums: {
            include: { medium: true },
          },
          targetStages: true,
          _count: {
            select: {
              roster: true,
              exhibitions: true,
            },
          },
        },
      }),
      this.prisma.galleryLocation.findMany({
        where: {
          isPrimary: true,
          city: { not: null },
          country: { not: null },
          gallery: { user: { status: 'active' } },
        },
        distinct: ['city', 'country'],
        select: { city: true, country: true },
        orderBy: [{ country: 'asc' }, { city: 'asc' }],
      }),
    ]);

    return {
      data: items.map((g) => ({
        id: g.userId,
        galleryName: g.galleryName,
        logoUrl: g.logoUrl,
        spaceType: g.spaceType,
        ethosStatement: g.ethosStatement,
        openCallStatus: g.openCallStatus,
        visitPolicyEnabled: g.visitPolicyEnabled,
        directOutreachEnabled: g.directOutreachEnabled,
        websiteUrl: g.websiteUrl,
        primaryLocation: g.locations[0] || null,
        mediums: g.mediums.map((m) => m.medium),
        targetStages: g.targetStages.map((t) => t.careerStage),
        representedArtistsCount: g._count.roster,
        exhibitionsCount: g._count.exhibitions,
      })),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      filters: {
        locations: locationOptions,
      },
    };
  }

  /**
   * Public gallery profile
   */
  async getPublicGallery(id: string) {
    const gallery = await this.prisma.galleryProfile.findUnique({
      where: { userId: id },
      include: {
        user: {
          select: {
            verificationStatus: true,
            createdAt: true,
            postedBriefs: {
              where: { status: { in: ['published', 'closed'] } },
              orderBy: { createdAt: 'desc' },
              include: {
                mediums: { include: { medium: true } },
                images: true,
              }
            }
          },
        },
        locations: true,
        mediums: {
          include: { medium: true },
        },
        targetStages: true,
        exhibitions: {
          orderBy: { startDate: 'desc' },
        },
        roster: {
          include: {
            artist: {
              select: {
                userId: true,
                workingName: true,
                fullName: true,
                photoUrl: true,
                careerStage: true,
                city: true,
                country: true,
                representationStatus: true,
              },
            },
          },
        },
      },
    });

    if (!gallery) {
      throw new NotFoundException('Gallery not found.');
    }

    return {
      ...gallery,
      id: gallery.userId,
      mediums: gallery.mediums.map((m) => m.medium),
      targetStages: gallery.targetStages.map((t) => t.careerStage),
      roster: gallery.roster.map((r) => ({
        id: r.id,
        artistId: r.artistId,
        status: r.status,
        representationType: r.representationType,
        note: r.note,
        addedAt: r.addedAt,
        artist: r.artist,
      })),
    };
  }

  /**
   * My gallery profile (owner)
   */
  async getMyGallery(userId: string) {
    const gallery = await this.prisma.galleryProfile.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            email1: true,
            email2: true,
            phone1: true,
            phone2: true,
            role: true,
            status: true,
            verificationStatus: true,
            createdAt: true,
            postedBriefs: {
              orderBy: { createdAt: 'desc' },
              include: {
                mediums: { include: { medium: true } },
                images: true,
              }
            }
          },
        },
        locations: true,
        mediums: {
          include: { medium: true },
        },
        targetStages: true,
        exhibitions: {
          orderBy: { startDate: 'desc' },
        },
        roster: {
          include: {
            artist: {
              select: {
                userId: true,
                workingName: true,
                fullName: true,
                photoUrl: true,
                careerStage: true,
                city: true,
                country: true,
              },
            },
          },
        },
      },
    });

    if (!gallery) {
      throw new NotFoundException('Gallery profile not found. Please complete onboarding.');
    }

    return {
      ...gallery,
      id: gallery.userId,
      contactEmail1: gallery.user.email1,
      contactEmail2: gallery.user.email2,
      contactPhone1: gallery.user.phone1,
      contactPhone2: gallery.user.phone2,
      mediums: gallery.mediums.map((m) => m.medium),
      targetStages: gallery.targetStages.map((t) => t.careerStage),
    };
  }

  /**
   * Update gallery profile
   */
  async updateMyGallery(userId: string, dto: UpdateGalleryProfileDto) {
    return this.prisma.$transaction(async (tx) => {
      // 1. Update GalleryProfile
      const gallery = await tx.galleryProfile.upsert({
        where: { userId },
        create: {
          userId,
          galleryName: dto.galleryName || 'Gallery',
          alsoKnownAs: dto.alsoKnownAs,
          logoUrl: dto.logoUrl,
          coverImageUrl: dto.coverImageUrl,
          spaceType: dto.spaceType,
          yearEstablished: dto.yearEstablished,
          numberOfLocations: dto.numberOfLocations,
          directorName: dto.directorName,
          directorEmail: dto.directorEmail,
          ethosStatement: dto.ethosStatement,
          mission: dto.mission,
          openCallStatus: dto.openCallStatus || 'invite_only',
          visitPolicyEnabled: dto.visitPolicyEnabled ?? false,
          directOutreachEnabled: dto.directOutreachEnabled ?? false,
          websiteUrl: dto.websiteUrl,
          socialLinks: dto.socialLinks ?? {},
        },
        update: {
          galleryName: dto.galleryName,
          alsoKnownAs: dto.alsoKnownAs !== undefined ? dto.alsoKnownAs : undefined,
          logoUrl: dto.logoUrl !== undefined ? dto.logoUrl : undefined,
          coverImageUrl: dto.coverImageUrl !== undefined ? dto.coverImageUrl : undefined,
          spaceType: dto.spaceType,
          yearEstablished: dto.yearEstablished !== undefined ? dto.yearEstablished : undefined,
          numberOfLocations: dto.numberOfLocations !== undefined ? dto.numberOfLocations : undefined,
          directorName: dto.directorName,
          directorEmail: dto.directorEmail,
          ethosStatement: dto.ethosStatement,
          mission: dto.mission !== undefined ? dto.mission : undefined,
          openCallStatus: dto.openCallStatus,
          visitPolicyEnabled: dto.visitPolicyEnabled,
          directOutreachEnabled: dto.directOutreachEnabled,
          websiteUrl: dto.websiteUrl,
          socialLinks: dto.socialLinks ? dto.socialLinks : undefined,
        },
      });

      // 2. Update user contact details if provided (Note: email1 is primary login credential and cannot be altered via profile update)
      if (
        dto.contactEmail2 !== undefined ||
        dto.contactPhone1 !== undefined ||
        dto.contactPhone2 !== undefined
      ) {
        await tx.user.update({
          where: { id: userId },
          data: {
            email2: dto.contactEmail2,
            phone1: dto.contactPhone1,
            phone2: dto.contactPhone2,
          },
        });
      }

      // 3. Location handling
      if (dto.location) {
        const existing = await tx.galleryLocation.findFirst({
          where: { galleryId: userId, isPrimary: true },
        });

        if (existing) {
          await tx.galleryLocation.update({
            where: { id: existing.id },
            data: {
              streetAddress: dto.location.streetAddress,
              city: dto.location.city,
              stateRegion: dto.location.stateRegion,
              country: dto.location.country,
              postcode: dto.location.postcode,
            },
          });
        } else {
          await tx.galleryLocation.create({
            data: {
              galleryId: userId,
              streetAddress: dto.location.streetAddress,
              city: dto.location.city,
              stateRegion: dto.location.stateRegion,
              country: dto.location.country,
              postcode: dto.location.postcode,
              isPrimary: true,
            },
          });
        }
      }

      // 4. Multiple locations if supplied
      if (dto.locations && dto.locations.length > 0) {
        await tx.galleryLocation.deleteMany({ where: { galleryId: userId } });
        for (let i = 0; i < dto.locations.length; i++) {
          const loc = dto.locations[i];
          await tx.galleryLocation.create({
            data: {
              galleryId: userId,
              streetAddress: loc.streetAddress,
              city: loc.city,
              stateRegion: loc.stateRegion,
              country: loc.country,
              postcode: loc.postcode,
              isPrimary: loc.isPrimary ?? (i === 0),
            },
          });
        }
      }

      // 5. Mediums
      if (dto.mediums) {
        await tx.galleryMedium.deleteMany({ where: { galleryId: userId } });
        for (const label of dto.mediums) {
          const term = await tx.taxonomyTerm.upsert({
            where: { category_label: { category: 'medium', label } },
            create: { category: 'medium', label },
            update: {},
          });
          await tx.galleryMedium.create({
            data: { galleryId: userId, mediumId: term.id },
          });
        }
      } else if (dto.mediumIds) {
        await tx.galleryMedium.deleteMany({ where: { galleryId: userId } });
        for (const mediumId of dto.mediumIds) {
          await tx.galleryMedium.create({
            data: { galleryId: userId, mediumId },
          });
        }
      }

      // 6. Target Career Stages
      if (dto.targetStages) {
        await tx.galleryTargetCareerStage.deleteMany({ where: { galleryId: userId } });
        for (const stage of dto.targetStages) {
          await tx.galleryTargetCareerStage.create({
            data: { galleryId: userId, careerStage: stage },
          });
        }
      }

      return this.getMyGallery(userId);
    });
  }

  // ─── Roster Management ───────────────────────────────────────────────

  async getRoster(userId: string) {
    return this.prisma.galleryRoster.findMany({
      where: { galleryId: userId },
      include: {
        artist: {
          select: {
            userId: true,
            workingName: true,
            fullName: true,
            photoUrl: true,
            careerStage: true,
            city: true,
            country: true,
            representationStatus: true,
          },
        },
      },
      orderBy: { addedAt: 'desc' },
    });
  }

  async addRosterArtist(userId: string, dto: AddRosterArtistDto) {
    const artist = await this.prisma.artistProfile.findUnique({
      where: { userId: dto.artistId },
    });

    if (!artist) {
      throw new NotFoundException('Artist profile not found.');
    }

    return this.prisma.galleryRoster.upsert({
      where: {
        galleryId_artistId: {
          galleryId: userId,
          artistId: dto.artistId,
        },
      },
      create: {
        galleryId: userId,
        artistId: dto.artistId,
        representationType: dto.representationType ?? 'exclusive',
        status: dto.status ?? 'active',
        note: dto.note,
      },
      update: {
        representationType: dto.representationType !== undefined ? dto.representationType : undefined,
        status: dto.status !== undefined ? dto.status : undefined,
        note: dto.note,
      },
      include: {
        artist: {
          select: {
            userId: true,
            workingName: true,
            fullName: true,
            photoUrl: true,
            careerStage: true,
            city: true,
            country: true,
            representationStatus: true,
          },
        },
      },
    });
  }

  async updateRosterStatus(userId: string, artistId: string, status: string) {
    const existing = await this.prisma.galleryRoster.findUnique({
      where: {
        galleryId_artistId: {
          galleryId: userId,
          artistId,
        },
      },
    });

    if (!existing) {
      throw new NotFoundException('Artist is not on your gallery roster.');
    }

    return this.prisma.galleryRoster.update({
      where: {
        galleryId_artistId: {
          galleryId: userId,
          artistId,
        },
      },
      data: { status },
      include: {
        artist: {
          select: {
            userId: true,
            workingName: true,
            fullName: true,
            photoUrl: true,
            careerStage: true,
            city: true,
            country: true,
            representationStatus: true,
          },
        },
      },
    });
  }

  async removeRosterArtist(userId: string, artistId: string) {
    const entry = await this.prisma.galleryRoster.findUnique({
      where: {
        galleryId_artistId: {
          galleryId: userId,
          artistId,
        },
      },
    });

    if (!entry) {
      throw new NotFoundException('Artist not found in gallery roster.');
    }

    await this.prisma.galleryRoster.delete({
      where: {
        galleryId_artistId: {
          galleryId: userId,
          artistId,
        },
      },
    });

    return { message: 'Artist removed from roster successfully.' };
  }

  // ─── Exhibitions Management ──────────────────────────────────────────

  async getExhibitions(userId: string) {
    return this.prisma.galleryExhibition.findMany({
      where: { galleryId: userId },
      orderBy: { startDate: 'desc' },
    });
  }

  async addExhibition(userId: string, dto: CreateExhibitionDto) {
    return this.prisma.galleryExhibition.create({
      data: {
        galleryId: userId,
        title: dto.title,
        description: dto.description,
        imageUrl: dto.imageUrl,
        exhibitionType: dto.exhibitionType,
        participatingArtists: dto.participatingArtists ?? [],
        startDate: dto.startDate ? new Date(dto.startDate) : null,
        endDate: dto.endDate ? new Date(dto.endDate) : null,
      },
    });
  }

  async updateExhibition(userId: string, exhibitionId: string, dto: UpdateExhibitionDto) {
    const exhibition = await this.prisma.galleryExhibition.findUnique({
      where: { id: exhibitionId },
    });

    if (!exhibition || exhibition.galleryId !== userId) {
      throw new NotFoundException('Exhibition not found or not owned by you.');
    }

    return this.prisma.galleryExhibition.update({
      where: { id: exhibitionId },
      data: {
        ...(dto.title !== undefined ? { title: dto.title } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.imageUrl !== undefined ? { imageUrl: dto.imageUrl } : {}),
        ...(dto.exhibitionType !== undefined ? { exhibitionType: dto.exhibitionType } : {}),
        ...(dto.participatingArtists !== undefined ? { participatingArtists: dto.participatingArtists } : {}),
        ...(dto.startDate !== undefined ? { startDate: dto.startDate ? new Date(dto.startDate) : null } : {}),
        ...(dto.endDate !== undefined ? { endDate: dto.endDate ? new Date(dto.endDate) : null } : {}),
      },
    });
  }

  async deleteExhibition(userId: string, exhibitionId: string) {
    const exhibition = await this.prisma.galleryExhibition.findUnique({
      where: { id: exhibitionId },
    });

    if (!exhibition || exhibition.galleryId !== userId) {
      throw new NotFoundException('Exhibition not found or not owned by you.');
    }

    await this.prisma.galleryExhibition.delete({
      where: { id: exhibitionId },
    });

    return { message: 'Exhibition deleted successfully.' };
  }
}
