import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateShortlistDto, AddShortlistArtistDto } from './dto/social.dto';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class SocialService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  // ─── Shortlists (Art Professional) ──────────────────────────────────

  async getShortlists(userId: string) {
    return this.prisma.shortlist.findMany({
      where: { ownerId: userId },
      include: {
        items: {
          include: {
            artist: {
              select: {
                userId: true,
                workingName: true,
                photoUrl: true,
                careerStage: true,
                city: true,
                country: true,
                representationStatus: true,
                availabilityStatus: true,
              },
            },
          },
          orderBy: { addedAt: 'desc' },
        },
        _count: {
          select: { items: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createShortlist(userId: string, dto: CreateShortlistDto) {
    return this.prisma.shortlist.create({
      data: {
        ownerId: userId,
        name: dto.name,
        description: dto.description,
      },
    });
  }

  async getShortlist(userId: string, shortlistId: string) {
    const shortlist = await this.prisma.shortlist.findUnique({
      where: { id: shortlistId },
      include: {
        items: {
          include: {
            artist: {
              select: {
                userId: true,
                workingName: true,
                photoUrl: true,
                careerStage: true,
                city: true,
                country: true,
                representationStatus: true,
                availabilityStatus: true,
              },
            },
          },
          orderBy: { addedAt: 'desc' },
        },
      },
    });

    if (!shortlist || shortlist.ownerId !== userId) {
      throw new NotFoundException('Shortlist not found or access denied.');
    }

    return shortlist;
  }

  async deleteShortlist(userId: string, shortlistId: string) {
    const shortlist = await this.prisma.shortlist.findUnique({
      where: { id: shortlistId },
    });

    if (!shortlist || shortlist.ownerId !== userId) {
      throw new NotFoundException('Shortlist not found or access denied.');
    }

    await this.prisma.shortlist.delete({
      where: { id: shortlistId },
    });

    return { message: 'Shortlist deleted successfully.' };
  }

  async addArtistToShortlist(
    userId: string,
    shortlistId: string,
    dto: AddShortlistArtistDto,
  ) {
    const shortlist = await this.prisma.shortlist.findUnique({
      where: { id: shortlistId },
    });

    if (!shortlist || shortlist.ownerId !== userId) {
      throw new NotFoundException('Shortlist not found or access denied.');
    }

    const artist = await this.prisma.artistProfile.findUnique({
      where: { userId: dto.artistId },
    });

    if (!artist) {
      throw new NotFoundException('Artist profile not found.');
    }

    return this.prisma.shortlistItem.upsert({
      where: {
        shortlistId_artistId: {
          shortlistId,
          artistId: dto.artistId,
        },
      },
      create: {
        shortlistId,
        artistId: dto.artistId,
      },
      update: {},
      include: {
        artist: {
          select: {
            userId: true,
            workingName: true,
            photoUrl: true,
            careerStage: true,
          },
        },
      },
    });
  }

  async removeArtistFromShortlist(
    userId: string,
    shortlistId: string,
    artistId: string,
  ) {
    const shortlist = await this.prisma.shortlist.findUnique({
      where: { id: shortlistId },
    });

    if (!shortlist || shortlist.ownerId !== userId) {
      throw new NotFoundException('Shortlist not found or access denied.');
    }

    const item = await this.prisma.shortlistItem.findUnique({
      where: {
        shortlistId_artistId: {
          shortlistId,
          artistId,
        },
      },
    });

    if (!item) {
      throw new NotFoundException('Artist not found in shortlist.');
    }

    await this.prisma.shortlistItem.delete({
      where: {
        shortlistId_artistId: {
          shortlistId,
          artistId,
        },
      },
    });

    return { message: 'Artist removed from shortlist.' };
  }

  // ─── Follows ────────────────────────────────────────────────────────

  async followArtist(followerId: string, artistId: string) {
    if (followerId === artistId) {
      throw new BadRequestException('You cannot follow yourself.');
    }

    const targetUser = await this.prisma.user.findUnique({
      where: { id: artistId },
    });

    if (!targetUser) {
      throw new BadRequestException('User not found.');
    }

    const existing = await this.prisma.follow.findUnique({
      where: { followerId_followeeId: { followerId, followeeId: artistId } },
    });
    const follow = await this.prisma.follow.upsert({
      where: {
        followerId_followeeId: {
          followerId,
          followeeId: artistId,
        },
      },
      create: {
        followerId,
        followeeId: artistId,
      },
      update: {},
    });

    if (!existing) {
      await this.notifications.deliver(artistId, {
        actorId: followerId,
        category: 'profile',
        type: 'new_follower',
        title: 'New follower',
        message: 'A member followed your artist profile.',
        link: '/artists/followers',
        metadata: { followerId },
        preference: 'requests',
        sendEmail: false,
      });
    }

    return follow;
  }

  async unfollowArtist(followerId: string, artistId: string) {
    const follow = await this.prisma.follow.findUnique({
      where: {
        followerId_followeeId: {
          followerId,
          followeeId: artistId,
        },
      },
    });

    if (!follow) {
      throw new NotFoundException('Follow record not found.');
    }

    await this.prisma.follow.delete({
      where: {
        followerId_followeeId: {
          followerId,
          followeeId: artistId,
        },
      },
    });

    return { message: 'Unfollowed artist successfully.' };
  }

  async getFollowedArtists(followerId: string) {
    const follows = await this.prisma.follow.findMany({
      where: { followerId },
      include: {
        followee: {
          include: {
            artistProfile: {
              select: {
                userId: true,
                workingName: true,
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
      orderBy: { createdAt: 'desc' },
    });

    return follows.map((f) => ({
      artistId: f.followeeId,
      followedAt: f.createdAt,
      artist: f.followee.artistProfile,
    }));
  }

  async checkFollow(followerId: string, artistId: string) {
    const follow = await this.prisma.follow.findUnique({
      where: {
        followerId_followeeId: {
          followerId,
          followeeId: artistId,
        },
      },
    });

    return { following: !!follow };
  }
}
