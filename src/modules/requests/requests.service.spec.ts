import { ForbiddenException } from '@nestjs/common';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { RequestsService } from './requests.service';

describe('RequestsService interaction rules', () => {
  const interactionPermission = { findUnique: jest.fn<() => Promise<any>>() };
  const service = new RequestsService(
    { interactionPermission } as any,
    { deliver: jest.fn() } as any,
  );
  const validate = (fromRole: string, toRole: string, requestType: string) =>
    (service as any).validateInteractionRules(fromRole, toRole, requestType);

  beforeEach(() => {
    interactionPermission.findUnique.mockReset();
    interactionPermission.findUnique.mockResolvedValue(null);
  });

  it('blocks artist cold outreach to galleries', async () => {
    await expect(validate('artist', 'gallery', 'enquiry')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('blocks artist outreach to collectors', async () => {
    await expect(validate('artist', 'collector', 'enquiry')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('blocks artist cold outreach to art professionals', async () => {
    await expect(validate('artist', 'art_professional', 'enquiry')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('blocks same-role direct requests outside the approved scope', async () => {
    await expect(validate('artist', 'artist', 'enquiry')).rejects.toBeInstanceOf(ForbiddenException);
    await expect(validate('gallery', 'gallery', 'enquiry')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('allows galleries to request an artist PVR', async () => {
    await expect(validate('gallery', 'artist', 'pvr')).resolves.toBeUndefined();
  });

  it('allows collector introduction, PVR, and visit requests to artists and galleries', async () => {
    await expect(validate('collector', 'artist', 'introduction')).resolves.toBeUndefined();
    await expect(validate('collector', 'artist', 'pvr')).resolves.toBeUndefined();
    await expect(validate('collector', 'gallery', 'visit')).resolves.toBeUndefined();
  });

  it('blocks collector enquiries because collectors must use opt-in requests', async () => {
    await expect(validate('collector', 'artist', 'enquiry')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('allows art professionals to contact artists and galleries', async () => {
    await expect(validate('art_professional', 'artist', 'enquiry')).resolves.toBeUndefined();
    await expect(validate('art_professional', 'gallery', 'pvr')).resolves.toBeUndefined();
  });

  it('honours blocked fallback permission rules', async () => {
    interactionPermission.findUnique.mockResolvedValue({ mode: 'blocked' });
    await expect(validate('gallery', 'art_professional', 'enquiry')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('does not expose a private viewing room before the request is accepted', async () => {
    const pendingRequest = {
      id: '11111111-1111-4111-8111-111111111111',
      requesterId: 'collector-1',
      recipientId: 'artist-1',
      requestType: 'pvr',
      status: 'pending',
      requester: { id: 'collector-1', role: 'collector' },
      recipient: { id: 'artist-1', role: 'artist' },
      pvrGrant: null,
      pvrGrantItems: [],
      thread: [],
    };
    const guardedService = new RequestsService(
      {
        request: { findUnique: jest.fn<() => Promise<any>>().mockResolvedValue(pendingRequest) },
        user: { findUnique: jest.fn<() => Promise<any>>().mockResolvedValue({ id: 'collector-1', role: 'collector' }) },
      } as any,
      { deliver: jest.fn() } as any,
    );

    await expect(
      guardedService.getPvrSession('collector-1', pendingRequest.id),
    ).rejects.toThrow('Private viewing access is available only after the artist accepts the request.');
  });
});
