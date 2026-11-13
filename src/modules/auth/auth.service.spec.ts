import { describe, expect, it, jest } from '@jest/globals';
import { AuthService } from './auth.service';

describe('AuthService settings auditing', () => {
  const existingSettings = {
    displayName: 'Aditi Patil',
    language: 'English',
    timeZone: 'Asia/Kolkata',
    notifications: {
      securityAlerts: true,
      verificationAlerts: true,
      governanceAlerts: true,
    },
  };

  const createService = () => {
    const transactionUserUpdate = jest.fn<(args: any) => Promise<any>>().mockResolvedValue({
      id: 'admin-1',
      settings: existingSettings,
    });
    const adminActionCreate = jest.fn<(args: any) => Promise<any>>().mockResolvedValue({ id: 'action-1' });
    const transaction = jest.fn(async (callback: (tx: any) => unknown) =>
      callback({
        user: { update: transactionUserUpdate },
        adminAction: { create: adminActionCreate },
      }),
    );
    const prisma = {
      user: {
        findUnique: jest.fn<(args: any) => Promise<any>>().mockResolvedValue({
          id: 'admin-1',
          role: 'admin',
          settings: existingSettings,
        }),
        findUniqueOrThrow: jest.fn<(args: any) => Promise<any>>(),
      },
      $transaction: transaction,
    };
    const service = new AuthService(
      prisma as any,
      {} as any,
      {} as any,
      { get: jest.fn() } as any,
      { deliver: jest.fn() } as any,
    );

    return { service, transaction, transactionUserUpdate, adminActionCreate };
  };

  it('does not update or audit an unchanged settings submission', async () => {
    const { service, transaction, adminActionCreate } = createService();

    const result = await service.updateSettings('admin-1', existingSettings);

    expect(result.message).toBe('No settings changes detected.');
    expect(transaction).not.toHaveBeenCalled();
    expect(adminActionCreate).not.toHaveBeenCalled();
  });

  it('updates and audits only settings that actually changed', async () => {
    const { service, transactionUserUpdate, adminActionCreate } = createService();

    await service.updateSettings('admin-1', {
      displayName: 'Aditi Patil',
      language: 'English',
      timeZone: 'UTC',
      notifications: existingSettings.notifications,
    });

    expect(transactionUserUpdate).toHaveBeenCalledTimes(1);
    expect(adminActionCreate).toHaveBeenCalledWith({
      data: {
        adminId: 'admin-1',
        actionType: 'ADMIN_SETTINGS_UPDATED',
        notes: 'Administrator updated: time zone.',
      },
    });
  });

  it('uses the saved Admin display name instead of an attached role profile name', async () => {
    const { service } = createService();
    const prisma = (service as any).prisma;
    prisma.user.findUniqueOrThrow.mockResolvedValue({
      id: 'admin-1',
      email1: 'patiladiti240@gmail.com',
      passwordHash: 'hidden',
      role: 'admin',
      status: 'active',
      onboardingCompleted: true,
      settings: { displayName: 'Admin Aditi Patil' },
      artistProfile: { fullName: 'Aditi Patil', workingName: 'Aditi Patil' },
      galleryProfile: null,
      artProfessionalProfile: null,
      collectorProfile: null,
    });

    const user = await service.me('admin-1');

    expect(user.fullName).toBe('Admin Aditi Patil');
    expect(user).not.toHaveProperty('passwordHash');
  });
});
