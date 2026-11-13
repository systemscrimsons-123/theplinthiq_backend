import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  ArtistOnboardingDto,
  GalleryOnboardingDto,
  ArtProfessionalOnboardingDto,
  CollectorOnboardingDto,
} from './dto/onboarding.dto';
import { SpaceType } from '@prisma/client';
import { MailService } from '../mail/mail.service';

@Injectable()
export class OnboardingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
  ) {}

  // ─── Artist Onboarding ──────────────────────────────────────────────
  async saveArtistOnboarding(userId: string, dto: ArtistOnboardingDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found.');
    const userEmail = user.email1;

    const result = await this.prisma.$transaction(async (tx) => {
      // 1. Upsert artist profile
      const artistProfile = await tx.artistProfile.upsert({
        where: { userId },
        create: {
          userId,
          fullName: dto.fullName || undefined,
          workingName: dto.workingName || dto.fullName || 'Artist',
          city: dto.city,
          stateRegion: dto.stateRegion,
          country: dto.country,
          careerStage: dto.careerStage,
          biography: dto.biography,
          artistStatement: dto.artistStatement,
          representationStatus: dto.representationStatus,
          availabilityStatus: dto.availabilityStatus,
          photoUrl: dto.photoUrl,
          websiteUrl: dto.websiteUrl,
          socialLinks: dto.socialLinks ?? {},
        },
        update: {
          fullName: dto.fullName || undefined,
          workingName: dto.workingName || undefined,
          city: dto.city || undefined,
          stateRegion: dto.stateRegion || undefined,
          country: dto.country || undefined,
          careerStage: dto.careerStage || undefined,
          biography: dto.biography || undefined,
          artistStatement: dto.artistStatement || undefined,
          representationStatus: dto.representationStatus || undefined,
          availabilityStatus: dto.availabilityStatus || undefined,
          photoUrl: dto.photoUrl || undefined,
          websiteUrl: dto.websiteUrl || undefined,
          socialLinks: dto.socialLinks ? dto.socialLinks : undefined,
        },
      });

      // 2. Mediums (supporting both mediums & primaryMediums)
      const mediumsList = dto.mediums || dto.primaryMediums;
      if (mediumsList && mediumsList.length > 0) {
        await tx.artistMedium.deleteMany({ where: { artistId: userId } });
        for (const label of mediumsList) {
          const term = await tx.taxonomyTerm.upsert({
            where: { category_label: { category: 'medium', label } },
            create: { category: 'medium', label },
            update: {},
          });
          await tx.artistMedium.create({
            data: { artistId: userId, mediumId: term.id },
          });
        }
      }

      // 3. Materials (supporting both materials & primaryMaterials)
      const materialsList = dto.materials || dto.primaryMaterials;
      if (materialsList && materialsList.length > 0) {
        await tx.artistMaterialTag.deleteMany({ where: { artistId: userId } });
        for (const tag of materialsList) {
          await tx.artistMaterialTag.create({
            data: { artistId: userId, tag: tag.trim() },
          });
        }
      }

      // 4. Scale ranges (supporting both scaleRanges & primaryScale)
      const scaleList = dto.scaleRanges || dto.primaryScale;
      if (scaleList && scaleList.length > 0) {
        await tx.artistScaleRange.deleteMany({ where: { artistId: userId } });
        for (const scale of scaleList) {
          await tx.artistScaleRange.create({
            data: { artistId: userId, scale },
          });
        }
      }

      // 5. Aesthetics
      if (dto.aesthetics && dto.aesthetics.length > 0) {
        await tx.artistAesthetic.deleteMany({ where: { artistId: userId } });
        for (const item of dto.aesthetics) {
          const term = await tx.taxonomyTerm.findUnique({
            where: { category_label: { category: 'aesthetic', label: item } },
          });
          if (term) {
            await tx.artistAesthetic.create({
              data: { artistId: userId, aestheticId: term.id },
            });
          } else {
            await tx.artistAesthetic.create({
              data: { artistId: userId, customLabel: item },
            });
          }
        }
      }

      // 6. Platform Intents (supporting both platformIntents & commercialIntent)
      const intentsList = dto.platformIntents || dto.commercialIntent;
      if (intentsList && intentsList.length > 0) {
        await tx.artistPlatformIntent.deleteMany({ where: { artistId: userId } });
        for (const intent of intentsList) {
          await tx.artistPlatformIntent.create({
            data: { artistId: userId, intent },
          });
        }
      }

      // 7. Featured Artwork / Sample Artwork
      if (dto.sampleArtwork && (dto.sampleArtwork.title || dto.sampleArtwork.imageUrl)) {
        const existingPortfolio = await tx.portfolioItem.findFirst({
          where: { artistId: userId },
        });
        const artworkYearInt = dto.sampleArtwork.year
          ? parseInt(String(dto.sampleArtwork.year).replace(/\D/g, ''), 10) || undefined
          : undefined;

        if (existingPortfolio) {
          await tx.portfolioItem.update({
            where: { id: existingPortfolio.id },
            data: {
              title: dto.sampleArtwork.title || existingPortfolio.title,
              year: artworkYearInt ?? existingPortfolio.year,
              medium: dto.sampleArtwork.medium || existingPortfolio.medium,
              dimensions: dto.sampleArtwork.dimensions || existingPortfolio.dimensions,
              imageUrl: dto.sampleArtwork.imageUrl || existingPortfolio.imageUrl,
              contextNotes: dto.sampleArtwork.contextNotes || existingPortfolio.contextNotes,
            },
          });
        } else {
          await tx.portfolioItem.create({
            data: {
              artistId: userId,
              title: dto.sampleArtwork.title || 'Featured Work',
              year: artworkYearInt,
              medium: dto.sampleArtwork.medium,
              dimensions: dto.sampleArtwork.dimensions,
              imageUrl: dto.sampleArtwork.imageUrl || '/images/onboarding/artist_onboarding_studio.jpg',
              contextNotes: dto.sampleArtwork.contextNotes,
              isPublic: true,
            },
          });
        }
      }

      // 8. CV Entries (Education, Exhibitions, Awards)
      if (dto.education || dto.exhibitions || dto.awards) {
        await tx.artistCvEntry.deleteMany({ where: { artistId: userId } });
        if (dto.education?.trim()) {
          await tx.artistCvEntry.create({
            data: {
              artistId: userId,
              entryType: 'education',
              title: dto.education.trim(),
            },
          });
        }
        if (dto.exhibitions?.trim()) {
          await tx.artistCvEntry.create({
            data: {
              artistId: userId,
              entryType: 'exhibition',
              title: dto.exhibitions.trim(),
            },
          });
        }
        if (dto.awards?.trim()) {
          await tx.artistCvEntry.create({
            data: {
              artistId: userId,
              entryType: 'award',
              title: dto.awards.trim(),
            },
          });
        }
      }

      // 9. Verification Evidence
      if (dto.evidenceUrl || dto.evidenceNotes) {
        await tx.verificationSubmission.create({
          data: {
            userId,
            evidenceUrl: dto.evidenceUrl,
            evidenceNotes: dto.evidenceNotes,
            decision: 'pending',
          },
        });
      }

      // 10. Mark onboarding status
      const isCompleted = dto.isDraft ? false : true;
      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: {
          email2: dto.email2 || undefined,
          phone1: dto.phone1 || undefined,
          phone2: dto.phone2 || undefined,
          onboardingCompleted: isCompleted,
          status: 'active',
        },
      });

      return {
        message: dto.isDraft
          ? 'Artist onboarding draft saved successfully.'
          : 'Artist onboarding completed successfully.',
        user: {
          id: updatedUser.id,
          email: updatedUser.email1,
          role: updatedUser.role,
          status: updatedUser.status,
          onboarding_completed: isCompleted,
        },
        profile: artistProfile,
      };
    });

    if (!dto.isDraft) {
      this.mailService
        .sendOnboardingCompletedEmail(userEmail, dto.workingName || userEmail.split('@')[0], 'artist')
        .catch((err) => console.warn('SMTP artist onboarding email notice:', err.message));
    }

    return result;
  }

  // ─── Gallery Onboarding ─────────────────────────────────────────────
  async saveGalleryOnboarding(userId: string, dto: GalleryOnboardingDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found.');
    const userEmail = user.email1;

    const result = await this.prisma.$transaction(async (tx) => {
      // 1. Upsert gallery profile
      const galleryLogoOrCover = dto.coverImageUrl || dto.logoUrl || undefined;

      // Map space type from enum or string
      let resolvedSpaceType: SpaceType | undefined = dto.spaceType;
      if (!resolvedSpaceType && dto.galleryType) {
        const lower = dto.galleryType.toLowerCase();
        if (lower.includes('commercial')) {
          resolvedSpaceType = 'commercial_brick_mortar';
        } else if (lower.includes('digital')) {
          resolvedSpaceType = 'digital';
        } else if (lower.includes('pop') || lower.includes('hybrid')) {
          resolvedSpaceType = 'hybrid_pop_up';
        } else if (
          lower.includes('non_profit') ||
          lower.includes('non-profit') ||
          lower.includes('institution') ||
          lower.includes('project') ||
          lower.includes('artist')
        ) {
          resolvedSpaceType = 'non_profit_project_space';
        }
      }

      const resolvedEthos = dto.ethosStatement || dto.overview || undefined;

      // Extract and clean genuine social links only (do not pollute with profile metadata)
      const rawSocial = dto.socialLinks || {};
      const cleanSocialLinks: Record<string, string> = {};
      if (rawSocial.instagram?.trim()) cleanSocialLinks.instagram = rawSocial.instagram.trim();
      if (rawSocial.linkedin?.trim()) cleanSocialLinks.linkedin = rawSocial.linkedin.trim();
      if (rawSocial.xLink?.trim() || rawSocial.twitter?.trim()) {
        cleanSocialLinks.xLink = (rawSocial.xLink || rawSocial.twitter).trim();
      }
      if (rawSocial.facebook?.trim()) cleanSocialLinks.facebook = rawSocial.facebook.trim();

      const representedCount = dto.representedArtistsCount
        ? parseInt(String(dto.representedArtistsCount), 10) || null
        : null;

      const galleryProfile = await tx.galleryProfile.upsert({
        where: { userId },
        create: {
          userId,
          galleryName: dto.galleryName || 'Gallery',
          alsoKnownAs: dto.alsoKnownAs || null,
          logoUrl: dto.logoUrl || null,
          coverImageUrl: dto.coverImageUrl || null,
          spaceType: resolvedSpaceType,
          yearEstablished: dto.yearEstablished || null,
          numberOfLocations: dto.numberOfLocations || null,
          directorName: dto.directorName || null,
          directorEmail: dto.directorEmail || null,
          ethosStatement: resolvedEthos || null,
          mission: dto.mission || null,
          representedArtistsCount: representedCount,
          initialArtists: dto.initialArtists || [],
          openCallStatus: dto.openCallStatus || 'invite_only',
          visitPolicyEnabled: dto.visitPolicyEnabled ?? false,
          directOutreachEnabled: dto.directOutreachEnabled ?? false,
          websiteUrl: dto.websiteUrl || null,
          socialLinks: cleanSocialLinks,
        },
        update: {
          galleryName: dto.galleryName || undefined,
          alsoKnownAs: dto.alsoKnownAs || undefined,
          logoUrl: dto.logoUrl || undefined,
          coverImageUrl: dto.coverImageUrl || undefined,
          spaceType: resolvedSpaceType || undefined,
          yearEstablished: dto.yearEstablished || undefined,
          numberOfLocations: dto.numberOfLocations || undefined,
          directorName: dto.directorName || undefined,
          directorEmail: dto.directorEmail || undefined,
          ethosStatement: resolvedEthos || undefined,
          mission: dto.mission || undefined,
          representedArtistsCount: representedCount || undefined,
          initialArtists: dto.initialArtists || undefined,
          openCallStatus: dto.openCallStatus || undefined,
          visitPolicyEnabled: dto.visitPolicyEnabled ?? undefined,
          directOutreachEnabled: dto.directOutreachEnabled ?? undefined,
          websiteUrl: dto.websiteUrl || undefined,
          socialLinks: cleanSocialLinks,
        },
      });

      // 2. Location (support both dto.location and dto.primaryLocation)
      const loc = dto.location || dto.primaryLocation;
      if (loc) {
        const streetAddress = loc.streetAddress || loc.address || undefined;
        const city = loc.city || undefined;
        const stateRegion = loc.stateRegion || undefined;
        const country = loc.country || undefined;
        const postcode = loc.postcode || undefined;

        const existingLocation = await tx.galleryLocation.findFirst({
          where: { galleryId: userId, isPrimary: true },
        });

        if (existingLocation) {
          await tx.galleryLocation.update({
            where: { id: existingLocation.id },
            data: {
              streetAddress: streetAddress || null,
              city: city || null,
              stateRegion: stateRegion || null,
              country: country || null,
              postcode: postcode || null,
            },
          });
        } else {
          await tx.galleryLocation.create({
            data: {
              galleryId: userId,
              streetAddress: streetAddress || null,
              city: city || null,
              stateRegion: stateRegion || null,
              country: country || null,
              postcode: postcode || null,
              isPrimary: true,
            },
          });
        }
      }

      // 3. Mediums (support both mediums and mediumsRepresented)
      const mediumList = dto.mediums || dto.mediumsRepresented;
      if (mediumList && mediumList.length > 0) {
        await tx.galleryMedium.deleteMany({ where: { galleryId: userId } });
        const uniqueMediums = Array.from(
          new Set(mediumList.map((m) => (typeof m === 'string' ? m.trim() : '')).filter(Boolean)),
        );
        for (const label of uniqueMediums) {
          const term = await tx.taxonomyTerm.upsert({
            where: { category_label: { category: 'medium', label } },
            create: { category: 'medium', label },
            update: {},
          });
          await tx.galleryMedium.upsert({
            where: { galleryId_mediumId: { galleryId: userId, mediumId: term.id } },
            create: { galleryId: userId, mediumId: term.id },
            update: {},
          });
        }
      }

      // 4. Target Career Stages
      if (dto.targetStages && dto.targetStages.length > 0) {
        await tx.galleryTargetCareerStage.deleteMany({
          where: { galleryId: userId },
        });
        const uniqueStages = Array.from(new Set(dto.targetStages));
        for (const careerStage of uniqueStages) {
          await tx.galleryTargetCareerStage.upsert({
            where: { galleryId_careerStage: { galleryId: userId, careerStage } },
            create: { galleryId: userId, careerStage },
            update: {},
          });
        }
      }

      // 5. Verification Submission
      if (dto.evidenceUrl || dto.evidenceNotes) {
        await tx.verificationSubmission.create({
          data: {
            userId,
            evidenceUrl: dto.evidenceUrl,
            evidenceNotes: dto.evidenceNotes,
            decision: 'pending',
          },
        });
      }

      // 6. Mark onboarding completed & activate status
      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: {
          email2: dto.email2 || undefined,
          phone1: dto.phone1 || undefined,
          phone2: dto.phone2 || undefined,
          onboardingCompleted: true,
          status: 'active',
        },
      });

      return {
        message: 'Gallery onboarding completed successfully.',
        user: {
          id: updatedUser.id,
          email: updatedUser.email1,
          role: updatedUser.role,
          status: updatedUser.status,
          onboarding_completed: true,
        },
        profile: galleryProfile,
      };
    });

    this.mailService
      .sendOnboardingCompletedEmail(userEmail, dto.galleryName || userEmail.split('@')[0], 'gallery')
      .catch((err) => console.warn('SMTP gallery onboarding email notice:', err.message));

    return result;
  }

  // ─── Art Professional Onboarding ────────────────────────────────────
  async saveProfessionalOnboarding(
    userId: string,
    dto: ArtProfessionalOnboardingDto,
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found.');
    const userEmail = user.email1;

    const result = await this.prisma.$transaction(async (tx) => {
      // 1. Upsert art professional profile
      const profSocial: Record<string, string> = {};
      if (dto.instagramUrl?.trim()) profSocial.instagram = dto.instagramUrl.trim();
      if (dto.linkedinUrl?.trim()) profSocial.linkedin = dto.linkedinUrl.trim();
      if (dto.xLink?.trim() || dto.twitterUrl?.trim()) {
        profSocial.xLink = (dto.xLink || dto.twitterUrl)!.trim();
      }

      const resolvedSubType = dto.subType || dto.professionalType || 'curator';
      const resolvedDisplayName = dto.displayName || dto.fullName || 'Art Professional';
      const resolvedOrg = dto.organisation || dto.organization || null;

      const profile = await tx.artProfessionalProfile.upsert({
        where: { userId },
        create: {
          userId,
          subType: resolvedSubType,
          displayName: resolvedDisplayName,
          workingName: dto.workingName || null,
          jobTitle: dto.jobTitle || null,
          yearsExperience: dto.yearsExperience || null,
          organisation: resolvedOrg,
          biography: dto.biography || null,
          backgroundText: dto.backgroundText || null,
          whyJoined: dto.whyJoined || null,
          whatDrives: dto.whatDrives || null,
          currentFocus: dto.currentFocus || null,
          additionalInterests: dto.additionalInterests || null,
          city: dto.city || null,
          stateRegion: dto.stateRegion || null,
          country: dto.country || null,
          websiteUrl: dto.websiteUrl || null,
          photoUrl: dto.photoUrl || null,
          socialLinks: profSocial,
        },
        update: {
          subType: resolvedSubType,
          displayName: resolvedDisplayName,
          workingName: dto.workingName !== undefined ? dto.workingName : undefined,
          jobTitle: dto.jobTitle !== undefined ? dto.jobTitle : undefined,
          yearsExperience: dto.yearsExperience !== undefined ? dto.yearsExperience : undefined,
          organisation: resolvedOrg || undefined,
          biography: dto.biography || undefined,
          backgroundText: dto.backgroundText || undefined,
          whyJoined: dto.whyJoined !== undefined ? dto.whyJoined : undefined,
          whatDrives: dto.whatDrives !== undefined ? dto.whatDrives : undefined,
          currentFocus: dto.currentFocus !== undefined ? dto.currentFocus : undefined,
          additionalInterests: dto.additionalInterests !== undefined ? dto.additionalInterests : undefined,
          city: dto.city || undefined,
          stateRegion: dto.stateRegion || undefined,
          country: dto.country || undefined,
          websiteUrl: dto.websiteUrl || undefined,
          photoUrl: dto.photoUrl || undefined,
          socialLinks: profSocial,
        },
      });

      // 2. Preferences
      await tx.artProfessionalPreferences.upsert({
        where: { userId },
        create: {
          userId,
          preferredCareerStages: dto.preferredCareerStages || [],
          preferredScale: dto.preferredScale || [],
          preferredLocation: dto.preferredLocation,
          note: dto.opportunityNote,
        },
        update: {
          preferredCareerStages: dto.preferredCareerStages || undefined,
          preferredScale: dto.preferredScale || undefined,
          preferredLocation: dto.preferredLocation || undefined,
          note: dto.opportunityNote || undefined,
        },
      });

      const preferredMediums = dto.preferredMediums || dto.mediums;
      if (preferredMediums) {
        await tx.artProfessionalPreferenceMedium.deleteMany({ where: { userId } });
        const uniqueMediums = Array.from(new Set(preferredMediums.map((label) => label.trim()).filter(Boolean)));
        for (const label of uniqueMediums) {
          const term = await tx.taxonomyTerm.upsert({
            where: { category_label: { category: 'medium', label } },
            create: { category: 'medium', label },
            update: {},
          });
          await tx.artProfessionalPreferenceMedium.create({
            data: { userId, mediumId: term.id },
          });
        }
      }

      // 3. Interests (also support areasOfInterest)
      const interestList = dto.interests || dto.areasOfInterest;
      if (interestList && interestList.length > 0) {
        await tx.artProfessionalInterest.deleteMany({
          where: { professionalId: userId },
        });
        const uniqueInterests = Array.from(
          new Set(interestList.map((i) => (typeof i === 'string' ? i.trim() : '')).filter(Boolean)),
        );
        for (const label of uniqueInterests) {
          const term = await tx.taxonomyTerm.upsert({
            where: { category_label: { category: 'interest', label } },
            create: { category: 'interest', label },
            update: {},
          });
          await tx.artProfessionalInterest.upsert({
            where: { professionalId_interestId: { professionalId: userId, interestId: term.id } },
            create: { professionalId: userId, interestId: term.id },
            update: {},
          });
        }
      }

      // 4. Contact details update on user & activate status
      await tx.user.update({
        where: { id: userId },
        data: {
          email2: dto.email2 || undefined,
          phone1: dto.phone1 || undefined,
          phone2: dto.phone2 || undefined,
          onboardingCompleted: true,
          status: 'active',
        },
      });

      // 5. Verification submission
      if (dto.evidenceUrl || dto.evidenceNotes) {
        await tx.verificationSubmission.create({
          data: {
            userId,
            evidenceUrl: dto.evidenceUrl,
            evidenceNotes: dto.evidenceNotes,
            decision: 'pending',
          },
        });
      }

      return {
        message: 'Art Professional onboarding completed successfully.',
        user: {
          id: user.id,
          email: user.email1,
          role: user.role,
          onboarding_completed: true,
        },
        profile,
      };
    });

    this.mailService
      .sendOnboardingCompletedEmail(userEmail, dto.displayName || userEmail.split('@')[0], 'art_professional')
      .catch((err) => console.warn('SMTP art professional onboarding email notice:', err.message));

    return result;
  }

  // ─── Collector Onboarding ───────────────────────────────────────────
  async saveCollectorOnboarding(userId: string, dto: CollectorOnboardingDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found.');
    const userEmail = user.email1;

    const result = await this.prisma.$transaction(async (tx) => {
      // 1. Upsert collector profile
      const profile = await tx.collectorProfile.upsert({
        where: { userId },
        create: {
          userId,
          displayHandle: dto.displayHandle || dto.displayName || 'Collector',
          realName: dto.realName || dto.displayName,
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
        },
        update: {
          displayHandle: dto.displayHandle || dto.displayName || undefined,
          realName: dto.realName || dto.displayName || undefined,
          isPseudonymous: dto.isPseudonymous ?? undefined,
          photoUrl: dto.photoUrl !== undefined ? dto.photoUrl : undefined,
          bio: dto.bio !== undefined ? dto.bio : undefined,
          city: dto.city !== undefined ? dto.city : undefined,
          stateRegion: dto.stateRegion !== undefined ? dto.stateRegion : undefined,
          country: dto.country !== undefined ? dto.country : undefined,
          websiteUrl: dto.websiteUrl !== undefined ? dto.websiteUrl : undefined,
          privacyTier: dto.privacyTier !== undefined ? dto.privacyTier : undefined,
          allowDirectInquiries: dto.allowDirectInquiries !== undefined ? dto.allowDirectInquiries : undefined,
          privacySettings: dto.privacySettings !== undefined ? dto.privacySettings : undefined,
        },
      });

      await tx.user.update({
        where: { id: userId },
        data: {
          email2: dto.email2 || undefined,
          phone1: dto.phone1 || undefined,
          phone2: dto.phone2 || undefined,
        },
      });

      // 2. Interests
      if ((dto.interests?.length || 0) + (dto.mediums?.length || 0) > 0) {
        await tx.collectorInterest.deleteMany({
          where: { collectorId: userId },
        });
        const taxonomySelections = [
          ...(dto.interests || []).map((label) => ({ category: 'interest' as const, label })),
          ...(dto.mediums || []).map((label) => ({ category: 'medium' as const, label })),
        ];
        const uniqueSelections = Array.from(
          new Map(taxonomySelections.map((item) => [`${item.category}:${item.label.trim()}`, item])).values(),
        ).filter((item) => item.label.trim());
        for (const selection of uniqueSelections) {
          const label = selection.label.trim();
          const term = await tx.taxonomyTerm.upsert({
            where: { category_label: { category: selection.category, label } },
            create: { category: selection.category, label },
            update: {},
          });
          await tx.collectorInterest.upsert({
            where: { collectorId_interestId: { collectorId: userId, interestId: term.id } },
            create: { collectorId: userId, interestId: term.id },
            update: {},
          });
        }
      }

      // 3. Career Stage Preferences
      if (dto.careerStagePrefs && dto.careerStagePrefs.length > 0) {
        await tx.collectorCareerStagePref.deleteMany({
          where: { collectorId: userId },
        });
        const uniqueStages = Array.from(new Set(dto.careerStagePrefs));
        for (const careerStage of uniqueStages) {
          await tx.collectorCareerStagePref.upsert({
            where: { collectorId_careerStage: { collectorId: userId, careerStage } },
            create: { collectorId: userId, careerStage },
            update: {},
          });
        }
      }

      // 4. Intents
      if (dto.intents && dto.intents.length > 0) {
        await tx.collectorIntent.deleteMany({
          where: { collectorId: userId },
        });
        const uniqueIntents = Array.from(new Set(dto.intents));
        for (const intent of uniqueIntents) {
          await tx.collectorIntent.upsert({
            where: { collectorId_intent: { collectorId: userId, intent } },
            create: { collectorId: userId, intent },
            update: {},
          });
        }
      }

      // 5. Mark onboarding completed & activate collector status
      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: {
          onboardingCompleted: true,
          status: 'active',
          verificationStatus: 'verified',
        },
      });

      return {
        message: 'Collector onboarding completed successfully.',
        user: {
          id: updatedUser.id,
          email: updatedUser.email1,
          role: updatedUser.role,
          status: updatedUser.status,
          onboarding_completed: true,
        },
        profile,
      };
    });

    this.mailService
      .sendOnboardingCompletedEmail(
        userEmail,
        dto.displayHandle || dto.realName || userEmail.split('@')[0],
        'collector',
      )
      .catch((err) => console.warn('SMTP collector onboarding email notice:', err.message));

    return result;
  }

  // ─── Mark Complete (Generic fallback) ───────────────────────────────
  async completeOnboarding(userId: string) {
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { onboardingCompleted: true },
    });

    this.mailService
      .sendOnboardingCompletedEmail(
        updated.email1,
        updated.email1.split('@')[0],
        updated.role,
      )
      .catch((err) => console.warn('SMTP complete onboarding email notice:', err.message));

    return {
      message: 'Onboarding marked as completed.',
      onboarding_completed: true,
      userId: updated.id,
    };
  }

  // ─── Get Onboarding Status ──────────────────────────────────────────
  async getStatus(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: {
        artistProfile: true,
        galleryProfile: true,
        artProfessionalProfile: true,
        collectorProfile: true,
      },
    });

    return {
      userId: user.id,
      role: user.role,
      status: user.status,
      email_verified: Boolean(user.emailVerifiedAt),
      onboarding_completed: Boolean(user.onboardingCompleted),
      has_profile: Boolean(
        user.artistProfile ||
          user.galleryProfile ||
          user.artProfessionalProfile ||
          user.collectorProfile,
      ),
    };
  }
}
