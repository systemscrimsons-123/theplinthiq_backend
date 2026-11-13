import { describe, expect, it, jest } from '@jest/globals';
import { NotificationsService } from './notifications.service';

describe('NotificationsService delivery preferences', () => {
  const createService = (notifications: Record<string, boolean>) => {
    const create = jest.fn<(args: any) => Promise<any>>().mockResolvedValue({ id: 'notification-1' });
    const update = jest.fn<(args: any) => Promise<any>>().mockResolvedValue({ id: 'notification-1' });
    const prisma = {
      user: {
        findUnique: jest.fn<(args: any) => Promise<any>>().mockResolvedValue({
          id: 'user-1',
          email1: 'member@example.com',
          settings: { notifications },
          artistProfile: { workingName: 'Test Artist' },
          galleryProfile: null,
          artProfessionalProfile: null,
          collectorProfile: null,
        }),
      },
      notification: { create, update },
    };
    const mail = {
      sendNotificationEmail: jest.fn<(args: any) => Promise<any>>().mockResolvedValue({ success: true }),
    };
    const config = { get: jest.fn<() => string>().mockReturnValue('http://localhost:3000') };
    return { service: new NotificationsService(prisma as any, mail as any, config as any), create, update, mail };
  };

  const input = {
    category: 'requests' as const,
    type: 'pvr_received',
    title: 'New PVR request',
    message: 'A collector requested access.',
    link: '/artists/pvr-requests',
    preference: 'requests' as const,
    emailCategory: 'PVR_REQUEST' as const,
  };

  it('creates an in-app record, sends email, and tracks successful email delivery', async () => {
    const { service, create, update, mail } = createService({ inAppPush: true, emailRequests: true });

    await service.deliver('user-1', input);

    expect(create).toHaveBeenCalledTimes(1);
    expect(mail.sendNotificationEmail).toHaveBeenCalledTimes(1);
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'notification-1' } }));
  });

  it('does not email when the matching email preference is disabled', async () => {
    const { service, create, mail } = createService({ inAppPush: true, emailRequests: false });

    await service.deliver('user-1', input);

    expect(create).toHaveBeenCalledTimes(1);
    expect(mail.sendNotificationEmail).not.toHaveBeenCalled();
  });

  it('can send email without creating an in-app record', async () => {
    const { service, create, mail } = createService({ inAppPush: false, emailRequests: true });

    await service.deliver('user-1', input);

    expect(create).not.toHaveBeenCalled();
    expect(mail.sendNotificationEmail).toHaveBeenCalledTimes(1);
  });
});
