import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  UpdateArtProfessionalProfileDto,
  UpdateArtProfessionalPreferencesDto,
  QueryArtProfessionalsDto,
} from './dto/art-professional.dto';

@Injectable()
export class ArtProfessionalsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * List/search art professionals (curators and art advisors)
   */
  async listArtProfessionals(query: QueryArtProfessionalsDto) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const where: any = { user: { status: 'active' } };

    if (query.subType) {
      where.subType = query.subType;
    }

    if (query.city) {
      where.city = { contains: query.city, mode: 'insensitive' };
    }

    if (query.country) {
      where.country = { contains: query.country, mode: 'insensitive' };
    }

    if (query.interest) {
      where.interests = {
        some: {
          interest: {
            label: { contains: query.interest, mode: 'insensitive' },
          },
        },
      };
    }

    if (query.search) {
      where.OR = [
        { displayName: { contains: query.search, mode: 'insensitive' } },
        { organisation: { contains: query.search, mode: 'insensitive' } },
        { biography: { contains: query.search, mode: 'insensitive' } },
        { backgroundText: { contains: query.search, mode: 'insensitive' } },
        { city: { contains: query.search, mode: 'insensitive' } },
        { country: { contains: query.search, mode: 'insensitive' } },
        {
          interests: {
            some: {
              interest: {
                label: { contains: query.search, mode: 'insensitive' },
              },
            },
          },
        },
        {
          preferences: {
            is: {
              mediums: {
                some: {
                  medium: {
                    label: { contains: query.search, mode: 'insensitive' },
                  },
                },
              },
            },
          },
        },
      ];
    }

    const [total, items] = await Promise.all([
      this.prisma.artProfessionalProfile.count({ where }),
      this.prisma.artProfessionalProfile.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          interests: {
            include: { interest: true },
          },
          preferences: {
            include: {
              mediums: {
                include: { medium: true },
              },
            },
          },
          user: {
            select: {
              verificationStatus: true,
              createdAt: true,
            },
          },
        },
      }),
    ]);

    return {
      data: items.map((p) => ({
        id: p.userId,
        subType: p.subType,
        displayName: p.displayName,
        photoUrl: p.photoUrl,
        organisation: p.organisation,
        biography: p.biography,
        city: p.city,
        country: p.country,
        websiteUrl: p.websiteUrl,
        socialLinks: p.socialLinks,
        verificationStatus: p.user.verificationStatus,
        interests: p.interests.map((i) => i.interest),
        preferences: p.preferences
          ? {
              preferredCareerStages: p.preferences.preferredCareerStages,
              preferredScale: p.preferences.preferredScale,
              preferredLocation: p.preferences.preferredLocation,
              note: p.preferences.note,
              mediums: p.preferences.mediums.map((m) => m.medium),
            }
          : null,
      })),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Public art professional profile
   */
  async getPublicProfile(id: string) {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    if (!isUuid) {
      throw new NotFoundException('Art Professional profile not found.');
    }

    const profile = await this.prisma.artProfessionalProfile.findUnique({
      where: { userId: id },
      include: {
        user: {
          select: {
            verificationStatus: true,
            createdAt: true,
          },
        },
        interests: {
          include: { interest: true },
        },
        preferences: {
          include: {
            mediums: {
              include: { medium: true },
            },
          },
        },
      },
    });

    if (!profile) {
      throw new NotFoundException('Art Professional profile not found.');
    }

    return {
      id: profile.userId,
      subType: profile.subType,
      displayName: profile.displayName,
      workingName: profile.workingName,
      photoUrl: profile.photoUrl,
      organisation: profile.organisation,
      jobTitle: profile.jobTitle,
      yearsExperience: profile.yearsExperience,
      biography: profile.biography,
      backgroundText: profile.backgroundText,
      city: profile.city,
      stateRegion: profile.stateRegion,
      country: profile.country,
      websiteUrl: profile.websiteUrl,
      socialLinks: profile.socialLinks,
      whyJoined: profile.whyJoined,
      whatDrives: profile.whatDrives,
      currentFocus: profile.currentFocus,
      additionalInterests: profile.additionalInterests,
      verificationStatus: profile.user.verificationStatus,
      createdAt: profile.createdAt,
      interests: profile.interests.map((i) => i.interest),
      preferences: profile.preferences
        ? {
            preferredCareerStages: profile.preferences.preferredCareerStages,
            preferredScale: profile.preferences.preferredScale,
            preferredLocation: profile.preferences.preferredLocation,
            note: profile.preferences.note,
            mediums: profile.preferences.mediums.map((m) => m.medium),
          }
        : null,
    };
  }

  /**
   * My art professional profile (owner)
   */
  async getMyProfile(userId: string) {
    const profile = await this.prisma.artProfessionalProfile.findUnique({
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
          },
        },
        interests: {
          include: { interest: true },
        },
        preferences: {
          include: {
            mediums: {
              include: { medium: true },
            },
          },
        },
      },
    });

    if (!profile) {
      throw new NotFoundException(
        'Art Professional profile not found. Please complete onboarding.',
      );
    }

    return {
      id: profile.userId,
      subType: profile.subType,
      displayName: profile.displayName,
      workingName: profile.workingName,
      photoUrl: profile.photoUrl,
      organisation: profile.organisation,
      jobTitle: profile.jobTitle,
      yearsExperience: profile.yearsExperience,
      biography: profile.biography,
      backgroundText: profile.backgroundText,
      city: profile.city,
      stateRegion: profile.stateRegion,
      country: profile.country,
      websiteUrl: profile.websiteUrl,
      socialLinks: profile.socialLinks,
      whyJoined: profile.whyJoined,
      whatDrives: profile.whatDrives,
      currentFocus: profile.currentFocus,
      additionalInterests: profile.additionalInterests,
      contactEmail1: profile.user.email1,
      contactEmail2: profile.user.email2,
      contactPhone1: profile.user.phone1,
      contactPhone2: profile.user.phone2,
      verificationStatus: profile.user.verificationStatus,
      interests: profile.interests.map((i) => i.interest),
      preferences: profile.preferences
        ? {
            preferredCareerStages: profile.preferences.preferredCareerStages,
            preferredScale: profile.preferences.preferredScale,
            preferredLocation: profile.preferences.preferredLocation,
            note: profile.preferences.note,
            mediums: profile.preferences.mediums.map((m) => m.medium),
          }
        : null,
    };
  }

  /**
   * Update profile
   */
  async updateMyProfile(userId: string, dto: UpdateArtProfessionalProfileDto) {
    return this.prisma.$transaction(async (tx) => {
      // 1. Update Profile
      const profile = await tx.artProfessionalProfile.upsert({
        where: { userId },
        create: {
          userId,
          subType: dto.subType || 'curator',
          displayName: dto.displayName || 'Art Professional',
          workingName: dto.workingName,
          photoUrl: dto.photoUrl,
          organisation: dto.organisation,
          jobTitle: dto.jobTitle,
          yearsExperience: dto.yearsExperience,
          biography: dto.biography,
          backgroundText: dto.backgroundText,
          city: dto.city,
          stateRegion: dto.stateRegion,
          country: dto.country,
          websiteUrl: dto.websiteUrl,
          whyJoined: dto.whyJoined,
          whatDrives: dto.whatDrives,
          currentFocus: dto.currentFocus,
          additionalInterests: dto.additionalInterests,
          socialLinks: dto.socialLinks ?? {},
        },
        update: {
          subType: dto.subType,
          displayName: dto.displayName,
          workingName: dto.workingName,
          photoUrl: dto.photoUrl,
          organisation: dto.organisation,
          jobTitle: dto.jobTitle,
          yearsExperience: dto.yearsExperience,
          biography: dto.biography,
          backgroundText: dto.backgroundText,
          city: dto.city,
          stateRegion: dto.stateRegion,
          country: dto.country,
          websiteUrl: dto.websiteUrl,
          whyJoined: dto.whyJoined,
          whatDrives: dto.whatDrives,
          currentFocus: dto.currentFocus,
          additionalInterests: dto.additionalInterests,
          socialLinks: dto.socialLinks ? dto.socialLinks : undefined,
        },
      });

      // 2. Update user contact info
      if (
        dto.contactEmail1 !== undefined ||
        dto.contactEmail2 !== undefined ||
        dto.contactPhone1 !== undefined ||
        dto.contactPhone2 !== undefined
      ) {
        await tx.user.update({
          where: { id: userId },
          data: {
            ...(dto.contactEmail1 ? { email1: dto.contactEmail1 } : {}),
            email2: dto.contactEmail2,
            phone1: dto.contactPhone1,
            phone2: dto.contactPhone2,
          },
        });
      }

      // 3. Update interests
      if (dto.interests) {
        await tx.artProfessionalInterest.deleteMany({ where: { professionalId: userId } });
        for (const label of dto.interests) {
          const term = await tx.taxonomyTerm.upsert({
            where: { category_label: { category: 'interest', label } },
            create: { category: 'interest', label },
            update: {},
          });
          await tx.artProfessionalInterest.create({
            data: { professionalId: userId, interestId: term.id },
          });
        }
      } else if (dto.interestIds) {
        await tx.artProfessionalInterest.deleteMany({ where: { professionalId: userId } });
        for (const interestId of dto.interestIds) {
          await tx.artProfessionalInterest.create({
            data: { professionalId: userId, interestId },
          });
        }
      }

      return this.getMyProfile(userId);
    });
  }

  // ─── Opportunity Preferences ─────────────────────────────────────────

  async getPreferences(userId: string) {
    const prefs = await this.prisma.artProfessionalPreferences.findUnique({
      where: { userId },
      include: {
        mediums: {
          include: { medium: true },
        },
      },
    });

    if (!prefs) {
      return {
        preferredCareerStages: [],
        preferredScale: [],
        preferredLocation: null,
        note: null,
        mediums: [],
      };
    }

    return {
      preferredCareerStages: prefs.preferredCareerStages,
      preferredScale: prefs.preferredScale,
      preferredLocation: prefs.preferredLocation,
      note: prefs.note,
      mediums: prefs.mediums.map((m) => m.medium),
    };
  }

  async updatePreferences(userId: string, dto: UpdateArtProfessionalPreferencesDto) {
    return this.prisma.$transaction(async (tx) => {
      const prefs = await tx.artProfessionalPreferences.upsert({
        where: { userId },
        create: {
          userId,
          preferredCareerStages: dto.preferredCareerStages ?? [],
          preferredScale: dto.preferredScale ?? [],
          preferredLocation: dto.preferredLocation,
          note: dto.note,
        },
        update: {
          preferredCareerStages: dto.preferredCareerStages,
          preferredScale: dto.preferredScale,
          preferredLocation: dto.preferredLocation,
          note: dto.note,
        },
      });

      if (dto.mediums) {
        await tx.artProfessionalPreferenceMedium.deleteMany({ where: { userId } });
        for (const label of dto.mediums) {
          const term = await tx.taxonomyTerm.upsert({
            where: { category_label: { category: 'medium', label } },
            create: { category: 'medium', label },
            update: {},
          });
          await tx.artProfessionalPreferenceMedium.create({
            data: { userId, mediumId: term.id },
          });
        }
      } else if (dto.mediumIds) {
        await tx.artProfessionalPreferenceMedium.deleteMany({ where: { userId } });
        for (const mediumId of dto.mediumIds) {
          await tx.artProfessionalPreferenceMedium.create({
            data: { userId, mediumId },
          });
        }
      }

      return this.getPreferences(userId);
    });
  }
}
