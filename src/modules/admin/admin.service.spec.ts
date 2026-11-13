import { BadRequestException } from '@nestjs/common';
import { describe, expect, it, jest } from '@jest/globals';
import { AdminService } from './admin.service';

describe('AdminService account status updates', () => {
  const createService = (targetStatus: 'active' | 'inactive' | 'pending_verification') => {
    const userUpdate = jest.fn<(args: any) => Promise<any>>().mockResolvedValue({
      id: 'user-1',
      email1: 'member@example.com',
      role: 'artist',
      status: 'inactive',
    });
    const adminActionCreate = jest.fn<(args: any) => Promise<any>>().mockResolvedValue({
      id: 'action-1',
    });
    const transaction = jest.fn(async (callback: (tx: any) => unknown) =>
      callback({
        user: { update: userUpdate },
        adminAction: { create: adminActionCreate },
      }),
    );
    const prisma = {
      user: {
        findUnique: jest.fn<(args: any) => Promise<any>>().mockResolvedValue({
          id: 'user-1',
          email1: 'member@example.com',
          role: 'artist',
          status: targetStatus,
        }),
        findMany: jest.fn<() => Promise<any[]>>().mockResolvedValue([]),
      },
      $transaction: transaction,
    };

    return {
      service: new AdminService(prisma as any, { deliver: jest.fn() } as any),
      transaction,
      userUpdate,
      adminActionCreate,
    };
  };

  it('rejects a status update when the account already has that status', async () => {
    const { service, transaction } = createService('active');

    await expect(
      service.updateUserStatus('admin-1', 'user-1', { status: 'active' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(transaction).not.toHaveBeenCalled();
  });

  it('prevents an administrator from disabling their own account', async () => {
    const { service, transaction } = createService('active');

    await expect(
      service.updateUserStatus('user-1', 'user-1', { status: 'inactive' }),
    ).rejects.toThrow('Administrators cannot disable their own account.');
    expect(transaction).not.toHaveBeenCalled();
  });

  it('updates and audits a valid account status transition', async () => {
    const { service, userUpdate, adminActionCreate } = createService('active');

    const result = await service.updateUserStatus('admin-1', 'user-1', {
      status: 'inactive',
      notes: 'Repeated policy violations.',
    });

    expect(userUpdate).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { status: 'inactive' },
    });
    expect(adminActionCreate).toHaveBeenCalledWith({
      data: {
        adminId: 'admin-1',
        targetUserId: 'user-1',
        actionType: 'UPDATE_ACCOUNT_STATUS',
        notes: 'Status changed from active to inactive. Repeated policy violations.',
      },
    });
    expect(result.user.status).toBe('inactive');
  });
});
