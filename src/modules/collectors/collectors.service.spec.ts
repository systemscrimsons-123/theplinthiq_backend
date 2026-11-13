import { describe, expect, it, jest } from '@jest/globals';
import { CollectorsService } from './collectors.service';

describe('CollectorsService public directory', () => {
  it('returns pseudonym-safe collector summaries without real names', async () => {
    const prisma = {
      collectorProfile: {
        count: jest.fn<() => Promise<number>>().mockResolvedValue(1),
        findMany: jest.fn<() => Promise<any[]>>().mockResolvedValue([
          {
            userId: 'collector-1',
            displayHandle: 'Collector #402',
            realName: 'Private Name',
            isPseudonymous: true,
            photoUrl: null,
            bio: 'Contemporary art patron.',
            city: 'Mumbai',
            country: 'India',
            privacyTier: 'private_collector',
            interests: [{ interest: { id: 'interest-1', label: 'Painting' } }],
            careerPrefs: [{ careerStage: 'emerging' }],
            intents: [{ intent: 'supporting_emerging_artists' }],
            user: { verificationStatus: 'verified' },
          },
        ]),
      },
    };
    const service = new CollectorsService(prisma as any);

    const result = await service.listCollectors({ search: 'Mumbai' });

    expect(result.data).toHaveLength(1);
    expect(result.data[0].displayHandle).toBe('Collector #402');
    expect(result.data[0]).not.toHaveProperty('realName');
    expect(result.data[0].interests).toEqual([]);
    expect(result.data[0].mediums).toEqual([{ id: 'interest-1', label: 'Painting' }]);
  });
});

describe('CollectorsService collections', () => {
  it('only saves public portfolio works to a collection owned by the collector', async () => {
    const prisma = {
      collection: {
        findUnique: jest.fn<() => Promise<any>>().mockResolvedValue({ id: 'collection-1', collectorId: 'collector-1' }),
      },
      portfolioItem: {
        findFirst: jest.fn<(args: { where: { id: string; isPublic: boolean } }) => Promise<any>>()
          .mockResolvedValue({ id: 'artwork-1', isPublic: true }),
      },
      collectionItem: {
        upsert: jest.fn<() => Promise<any>>().mockResolvedValue({ collectionId: 'collection-1', portfolioItemId: 'artwork-1' }),
      },
    };
    const service = new CollectorsService(prisma as any);

    await service.addCollectionItem('collector-1', 'collection-1', { portfolioItemId: 'artwork-1', note: 'Research' });

    expect(prisma.portfolioItem.findFirst).toHaveBeenCalledWith({ where: { id: 'artwork-1', isPublic: true } });
    expect(prisma.collectionItem.upsert).toHaveBeenCalled();
  });

  it('rejects attempts to modify another collector collection', async () => {
    const prisma = {
      collection: {
        findUnique: jest.fn<() => Promise<any>>().mockResolvedValue({ id: 'collection-1', collectorId: 'collector-2' }),
      },
    };
    const service = new CollectorsService(prisma as any);

    await expect(service.deleteCollection('collector-1', 'collection-1')).rejects.toThrow('Collection not found or access denied.');
  });
});
