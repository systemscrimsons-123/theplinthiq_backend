import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  UpdateCollectorProfileDto,
  CreateCollectionDto,
  UpdateCollectionDto,
  AddCollectionItemDto,
  QueryCollectorsDto,
} from './dto/collector.dto';

const LEGACY_MEDIUM_LABELS = new Set([
  'painting', 'drawing', 'printmaking', 'photography', 'sculpture', 'ceramics',
  'textile / fibre', 'jewellery / metalwork', 'glass', 'video / film',
  'performance', 'digital / new media', 'digital art', 'installation', 'mixed media',
  'film & video', 'textile art', 'textile & fiber',
  'collage / assemblage', 'illustration', 'street art / muralism', 'sound art',
  'other',
]);

function isMediumInterest(item: { interest: { category?: string; label: string } }) {
  return item.interest.category === 'medium'
    || LEGACY_MEDIUM_LABELS.has(item.interest.label.toLowerCase());
}

@Injectable()
export class CollectorsService {
  constructor(private readonly prisma: PrismaService) {}

  async listCollectors(query: QueryCollectorsDto) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(query.limit) || 20));
    const skip = (page - 1) * limit;
    const where: any = { user: { status: 'active' } };

    if (query.city) where.city = { contains: query.city, mode: 'insensitive' };
    if (query.country) where.country = { contains: query.country, mode: 'insensitive' };
    if (query.interest) {
      where.interests = { some: { interest: { label: { contains: query.interest, mode: 'insensitive' } } } };
    }
    if (query.search) {
      where.OR = [
        { displayHandle: { contains: query.search, mode: 'insensitive' } },
        { bio: { contains: query.search, mode: 'insensitive' } },
        { city: { contains: query.search, mode: 'insensitive' } },
        { country: { contains: query.search, mode: 'insensitive' } },
        { interests: { some: { interest: { label: { contains: query.search, mode: 'insensitive' } } } } },
      ];
    }

    const [total, collectors] = await Promise.all([
      this.prisma.collectorProfile.count({ where }),
      this.prisma.collectorProfile.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          interests: { include: { interest: true } },
          careerPrefs: true,
          intents: true,
          user: { select: { verificationStatus: true } },
        },
      }),
    ]);

    return {
      data: collectors.map((collector) => ({
        id: collector.userId,
        displayHandle: collector.displayHandle,
        isPseudonymous: collector.isPseudonymous,
        photoUrl: collector.photoUrl,
        bio: collector.bio,
        city: collector.city,
        country: collector.country,
        privacyTier: collector.privacyTier,
        verificationStatus: collector.user.verificationStatus,
        interests: collector.interests
          .filter((item) => !isMediumInterest(item))
          .map((item) => item.interest),
        mediums: collector.interests
          .filter(isMediumInterest)
          .map((item) => item.interest),
        careerStages: collector.careerPrefs.map((item) => item.careerStage),
        collectingIntents: collector.intents.map((item) => item.intent),
      })),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  /**
   * Public collector profile (respecting pseudonymity rules)
   */
  async getPublicProfile(id: string, viewerId?: string) {
    const collector = await this.prisma.collectorProfile.findUnique({
      where: { userId: id },
      include: {
        interests: {
          include: { interest: true },
        },
        careerPrefs: true,
        intents: true,
        user: {
          select: {
            verificationStatus: true,
            createdAt: true,
          },
        },
      },
    });

    if (!collector) {
      throw new NotFoundException('Collector profile not found.');
    }

    let revealIdentity = false;

    // Check if identity should be revealed
    if (viewerId) {
      if (viewerId === id) {
        revealIdentity = true;
      } else {
        // Collector identity is revealed only to the party the collector chose to contact.
        const initiatedInteraction = await this.prisma.request.findFirst({
          where: {
            requesterId: id,
            recipientId: viewerId,
            status: { in: ['pending', 'accepted'] },
          },
        });

        if (initiatedInteraction) {
          revealIdentity = true;
        }
      }
    }

    const isPseudonymous = collector.isPseudonymous && !revealIdentity;

    return {
      id: collector.userId,
      displayHandle: collector.displayHandle,
      realName: isPseudonymous ? null : collector.realName,
      isPseudonymous: collector.isPseudonymous,
      identityRevealed: revealIdentity,
      photoUrl: collector.photoUrl,
      bio: collector.bio,
      city: collector.city,
      stateRegion: collector.stateRegion,
      country: collector.country,
      websiteUrl: collector.websiteUrl,
      privacyTier: collector.privacyTier,
      allowDirectInquiries: collector.allowDirectInquiries,
      verificationStatus: collector.user.verificationStatus,
      interests: collector.interests.filter((i) => !isMediumInterest(i)).map((i) => i.interest),
      mediums: collector.interests.filter(isMediumInterest).map((i) => i.interest),
      careerStages: collector.careerPrefs.map((c) => c.careerStage),
      collectingIntents: collector.intents.map((i) => i.intent),
      bannerUrl: collector.bannerUrl,
      collectorType: collector.collectorType,
      collectingSince: collector.collectingSince,
      curatorialStatement: collector.curatorialStatement,
      collectingEras: collector.collectingEras,
      spatialContexts: collector.spatialContexts,
      instagramHandle: collector.instagramHandle,
      linkedinHandle: collector.linkedinHandle,
    };
  }

  /**
   * My collector profile (owner)
   */
  async getMyProfile(userId: string) {
    const collector = await this.prisma.collectorProfile.findUnique({
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
        careerPrefs: true,
        intents: true,
        _count: {
          select: { collections: true },
        },
      },
    });

    if (!collector) {
      throw new NotFoundException('Collector profile not found. Please complete onboarding.');
    }

    return {
      id: collector.userId,
      displayHandle: collector.displayHandle,
      realName: collector.realName,
      isPseudonymous: collector.isPseudonymous,
      photoUrl: collector.photoUrl,
      bio: collector.bio,
      city: collector.city,
      stateRegion: collector.stateRegion,
      country: collector.country,
      websiteUrl: collector.websiteUrl,
      privacyTier: collector.privacyTier,
      allowDirectInquiries: collector.allowDirectInquiries,
      privacySettings: collector.privacySettings,
      contactEmail1: collector.user.email1,
      contactEmail2: collector.user.email2,
      contactPhone1: collector.user.phone1,
      contactPhone2: collector.user.phone2,
      verificationStatus: collector.user.verificationStatus,
      interests: collector.interests.filter((i) => !isMediumInterest(i)).map((i) => i.interest),
      mediums: collector.interests.filter(isMediumInterest).map((i) => i.interest),
      careerStages: collector.careerPrefs.map((c) => c.careerStage),
      collectingIntents: collector.intents.map((i) => i.intent),
      collectionsCount: collector._count.collections,
      bannerUrl: collector.bannerUrl,
      collectorType: collector.collectorType,
      collectingSince: collector.collectingSince,
      curatorialStatement: collector.curatorialStatement,
      collectingEras: collector.collectingEras,
      spatialContexts: collector.spatialContexts,
      instagramHandle: collector.instagramHandle,
      linkedinHandle: collector.linkedinHandle,
    };
  }

  /**
   * Update collector profile
   */
  async updateMyProfile(userId: string, dto: UpdateCollectorProfileDto) {
    console.log("UPDATE PAYLOAD:", dto);
    return this.prisma.$transaction(async (tx) => {
      // 1. Update Profile
      await tx.collectorProfile.upsert({
        where: { userId },
        create: {
          userId,
          displayHandle: dto.displayHandle || 'Collector',
          realName: dto.realName,
          isPseudonymous: dto.isPseudonymous ?? true,
          photoUrl: dto.photoUrl,
          bio: dto.bio,
          city: dto.city,
          stateRegion: dto.stateRegion,
          country: dto.country,
          websiteUrl: dto.websiteUrl,
          privacyTier: dto.privacyTier || 'public',
          allowDirectInquiries: dto.allowDirectInquiries ?? true,
          privacySettings: dto.privacySettings ?? {},
          bannerUrl: dto.bannerUrl,
          collectorType: dto.collectorType,
          collectingSince: dto.collectingSince,
          curatorialStatement: dto.curatorialStatement,
          collectingEras: dto.collectingEras ?? [],
          spatialContexts: dto.spatialContexts ?? [],
          instagramHandle: dto.instagramHandle,
          linkedinHandle: dto.linkedinHandle,
        },
        update: {
          displayHandle: dto.displayHandle,
          realName: dto.realName,
          isPseudonymous: dto.isPseudonymous,
          photoUrl: dto.photoUrl !== undefined ? dto.photoUrl : undefined,
          bio: dto.bio !== undefined ? dto.bio : undefined,
          city: dto.city,
          stateRegion: dto.stateRegion !== undefined ? dto.stateRegion : undefined,
          country: dto.country,
          websiteUrl: dto.websiteUrl !== undefined ? dto.websiteUrl : undefined,
          privacyTier: dto.privacyTier !== undefined ? dto.privacyTier : undefined,
          allowDirectInquiries: dto.allowDirectInquiries !== undefined ? dto.allowDirectInquiries : undefined,
          privacySettings: dto.privacySettings !== undefined ? dto.privacySettings : undefined,
          bannerUrl: dto.bannerUrl !== undefined ? dto.bannerUrl : undefined,
          collectorType: dto.collectorType !== undefined ? dto.collectorType : undefined,
          collectingSince: dto.collectingSince !== undefined ? dto.collectingSince : undefined,
          curatorialStatement: dto.curatorialStatement !== undefined ? dto.curatorialStatement : undefined,
          collectingEras: dto.collectingEras !== undefined ? dto.collectingEras : undefined,
          spatialContexts: dto.spatialContexts !== undefined ? dto.spatialContexts : undefined,
          instagramHandle: dto.instagramHandle !== undefined ? dto.instagramHandle : undefined,
          linkedinHandle: dto.linkedinHandle !== undefined ? dto.linkedinHandle : undefined,
        },
      });

      // 2. Update contact details if provided
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
      if (dto.interests || dto.mediums) {
        await tx.collectorInterest.deleteMany({ where: { collectorId: userId } });
        const selections = [
          ...(dto.interests || []).map((label) => ({ category: 'interest' as const, label })),
          ...(dto.mediums || []).map((label) => ({ category: 'medium' as const, label })),
        ];
        const uniqueSelections = Array.from(
          new Map(selections.map((item) => [`${item.category}:${item.label.trim()}`, item])).values(),
        ).filter((item) => item.label.trim());
        for (const selection of uniqueSelections) {
          const label = selection.label.trim();
          const term = await tx.taxonomyTerm.upsert({
            where: { category_label: { category: selection.category, label } },
            create: { category: selection.category, label },
            update: {},
          });
          await tx.collectorInterest.create({
            data: { collectorId: userId, interestId: term.id },
          });
        }
      } else if (dto.interestIds) {
        await tx.collectorInterest.deleteMany({ where: { collectorId: userId } });
        for (const interestId of dto.interestIds) {
          await tx.collectorInterest.create({
            data: { collectorId: userId, interestId },
          });
        }
      }

      // 4. Update career stage preferences
      if (dto.careerPrefs) {
        await tx.collectorCareerStagePref.deleteMany({ where: { collectorId: userId } });
        for (const stage of dto.careerPrefs) {
          await tx.collectorCareerStagePref.create({
            data: { collectorId: userId, careerStage: stage },
          });
        }
      }

      // 5. Update collecting intents
      if (dto.intents) {
        await tx.collectorIntent.deleteMany({ where: { collectorId: userId } });
        for (const intent of dto.intents) {
          await tx.collectorIntent.create({
            data: { collectorId: userId, intent },
          });
        }
      }

      return this.getMyProfile(userId);
    });
  }

  // ─── Collections / Moodboards ────────────────────────────────────────

  async getCollections(userId: string) {
    return this.prisma.collection.findMany({
      where: { collectorId: userId },
      include: {
        items: {
          orderBy: { createdAt: 'desc' },
          include: {
            portfolioItem: {
              select: {
                id: true,
                imageUrl: true,
                title: true,
                year: true,
                medium: true,
                dimensions: true,
                contextNotes: true,
                artist: {
                  select: {
                    userId: true,
                    fullName: true,
                    workingName: true,
                  },
                },
              },
            },
          },
        },
        _count: {
          select: { items: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createCollection(userId: string, dto: CreateCollectionDto) {
    const name = dto.name.trim();
    if (!name) throw new BadRequestException('Collection name is required.');
    return this.prisma.collection.create({
      data: {
        collectorId: userId,
        name,
        description: dto.description,
        collectionType: dto.collectionType || 'moodboard',
      },
    });
  }

  async getCollection(userId: string, collectionId: string) {
    const collection = await this.prisma.collection.findUnique({
      where: { id: collectionId },
      include: {
        items: {
          include: {
            portfolioItem: {
              include: {
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
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!collection || collection.collectorId !== userId) {
      throw new NotFoundException('Collection not found or access denied.');
    }

    return collection;
  }

  async updateCollection(userId: string, collectionId: string, dto: UpdateCollectionDto) {
    const collection = await this.prisma.collection.findUnique({
      where: { id: collectionId },
    });

    if (!collection || collection.collectorId !== userId) {
      throw new NotFoundException('Collection not found or access denied.');
    }

    const name = dto.name?.trim();
    if (dto.name !== undefined && !name) {
      throw new BadRequestException('Collection name is required.');
    }

    return this.prisma.collection.update({
      where: { id: collectionId },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.collectionType !== undefined ? { collectionType: dto.collectionType } : {}),
      },
    });
  }

  async deleteCollection(userId: string, collectionId: string) {
    const collection = await this.prisma.collection.findUnique({
      where: { id: collectionId },
    });

    if (!collection || collection.collectorId !== userId) {
      throw new NotFoundException('Collection not found or access denied.');
    }

    await this.prisma.collection.delete({
      where: { id: collectionId },
    });

    return { message: 'Collection deleted successfully.' };
  }

  async addCollectionItem(userId: string, collectionId: string, dto: AddCollectionItemDto) {
    const collection = await this.prisma.collection.findUnique({
      where: { id: collectionId },
    });

    if (!collection || collection.collectorId !== userId) {
      throw new NotFoundException('Collection not found or access denied.');
    }

    const portfolioItem = await this.prisma.portfolioItem.findFirst({
      where: { id: dto.portfolioItemId, isPublic: true },
    });

    if (!portfolioItem) {
      throw new NotFoundException('Public portfolio item not found.');
    }

    return this.prisma.collectionItem.upsert({
      where: {
        collectionId_portfolioItemId: {
          collectionId,
          portfolioItemId: dto.portfolioItemId,
        },
      },
      create: {
        collectionId,
        portfolioItemId: dto.portfolioItemId,
        note: dto.note,
      },
      update: {
        note: dto.note,
      },
      include: {
        portfolioItem: true,
      },
    });
  }

  async removeCollectionItem(
    userId: string,
    collectionId: string,
    portfolioItemId: string,
  ) {
    const collection = await this.prisma.collection.findUnique({
      where: { id: collectionId },
    });

    if (!collection || collection.collectorId !== userId) {
      throw new NotFoundException('Collection not found or access denied.');
    }

    const item = await this.prisma.collectionItem.findUnique({
      where: {
        collectionId_portfolioItemId: {
          collectionId,
          portfolioItemId,
        },
      },
    });

    if (!item) {
      throw new NotFoundException('Item not found in collection.');
    }

    await this.prisma.collectionItem.delete({
      where: {
        collectionId_portfolioItemId: {
          collectionId,
          portfolioItemId,
        },
      },
    });

    return { message: 'Item removed from collection.' };
  }
}
