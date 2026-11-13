import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../prisma/prisma.service';
import {
  SignupDto,
  LoginDto,
  VerifyEmailDto,
  ResendVerificationDto,
  ResetPasswordDto,
  UpdateUserStatusDto,
  ChangePasswordDto,
  UpdateSettingsDto,
  DeleteAccountDto,
} from './dto/auth.dto';
import { UserRole, AccountStatus, VerificationStatus } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { MailService } from '../mail/mail.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class AuthService {
  private readonly frontendUrl: string;

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private mailService: MailService,
    private config: ConfigService,
    private notifications: NotificationsService,
  ) {
    const isProd = this.config.get<string>('NODE_ENV') === 'production';
    const defaultFrontendUrl = isProd
      ? 'https://plinth.demotempwebsite.co.in'
      : 'http://localhost:3000';
    this.frontendUrl = (
      this.config.get<string>('FRONTEND_URL') || defaultFrontendUrl
    ).replace(/\/+$/, '');
  }

  // ─── Signup ─────────────────────────────────────────────────────────
  async signup(dto: SignupDto) {
    const exists = await this.prisma.user.findUnique({
      where: { email1: dto.email },
    });
    if (exists) throw new ConflictException('An account with this email already exists.');

    const passwordHash = await bcrypt.hash(dto.password, 12);

    const user = await this.prisma.user.create({
      data: {
        email1: dto.email,
        passwordHash,
        role: dto.role,
        status: 'pending_verification',
        verificationStatus: 'unverified',
        emailVerifiedAt: null,
      },
    });

    // Automatically initialize appropriate profile based on role
    const fallbackName = dto.fullName?.trim() || dto.email.split('@')[0];

    if (dto.role === 'artist') {
      await this.prisma.artistProfile.create({
        data: {
          userId: user.id,
          fullName: dto.fullName?.trim() || undefined,
          workingName: fallbackName,
          country: dto.country || undefined,
        },
      });
    } else if (dto.role === 'gallery') {
      await this.prisma.galleryProfile.create({
        data: {
          userId: user.id,
          galleryName: fallbackName,
        },
      });
    } else if (dto.role === 'art_professional') {
      await this.prisma.artProfessionalProfile.create({
        data: {
          userId: user.id,
          displayName: fallbackName,
          subType: 'curator',
        },
      });
    } else if (dto.role === 'collector') {
      await this.prisma.collectorProfile.create({
        data: {
          userId: user.id,
          displayHandle: `Collector #${Math.floor(100 + Math.random() * 900)}`,
          realName: dto.fullName?.trim() || undefined,
          country: dto.country || undefined,
        },
      });
    }

    // Generate email verification token (valid for 24h)
    const verifyToken = this.jwtService.sign(
      { sub: user.id, email: user.email1, purpose: 'email_verification' },
      { expiresIn: '24h' },
    );

    // Send verification email via SMTP
    try {
      await this.mailService.sendVerificationEmail(
        user.email1,
        dto.fullName || user.email1.split('@')[0],
        verifyToken,
      );
    } catch (err: any) {
      console.warn('SMTP verification email dispatch notice:', err?.message);
    }

    return {
      message: 'Account created successfully. Please check your inbox to verify your email.',
      user: this.sanitizeUser(user),
      email_verified: false,
    };
  }

  // ─── Verify Email ───────────────────────────────────────────────────
  async verifyEmail(dto: VerifyEmailDto) {
    let payload: { sub: string; email: string; purpose: string };
    try {
      payload = this.jwtService.verify(dto.token);
    } catch {
      throw new BadRequestException('Verification token is invalid or has expired.');
    }

    if (payload.purpose !== 'email_verification') {
      throw new BadRequestException('Invalid token purpose.');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: {
        artistProfile: true,
        galleryProfile: true,
        artProfessionalProfile: true,
        collectorProfile: true,
      },
    });

    if (!user) throw new NotFoundException('User not found.');

    if (user.emailVerifiedAt) {
      let currentStatus = user.status;
      if (user.status === 'pending_verification') {
        const reactivated = await this.prisma.user.update({
          where: { id: user.id },
          data: { status: 'active' },
        });
        currentStatus = reactivated.status;
        user.status = reactivated.status;
      }
      const token = this.signToken(user.id, user.email1, user.role);
      return {
        message: 'Email is already verified.',
        user: this.sanitizeUser(user),
        access_token: token,
        account_status: currentStatus,
        can_login: true,
        notice: 'Your email is already verified. Your session has been authenticated.',
      };
    }

    // Mark email as verified and set status to active so user can access onboarding and login
    const updated = await this.prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerifiedAt: new Date(),
        status: 'active',
      },
      include: {
        artistProfile: true,
        galleryProfile: true,
        artProfessionalProfile: true,
        collectorProfile: true,
      },
    });

    const token = this.signToken(updated.id, updated.email1, updated.role);

    return {
      message: 'Email verified successfully.',
      user: this.sanitizeUser(updated),
      access_token: token,
      account_status: updated.status,
      can_login: true,
      notice: 'Your email is verified and your account is active. You can now proceed to onboarding.',
    };
  }

  // ─── Resend Email Verification ──────────────────────────────────────
  async resendVerification(dto: ResendVerificationDto) {
    const user = await this.prisma.user.findUnique({ where: { email1: dto.email } });
    if (!user) {
      return { message: 'If an account exists with that email, a verification link has been sent.' };
    }

    if (user.emailVerifiedAt) {
      return { message: 'This email is already verified. You can proceed to log in.' };
    }

    const verifyToken = this.jwtService.sign(
      { sub: user.id, email: user.email1, purpose: 'email_verification' },
      { expiresIn: '24h' },
    );

    try {
      await this.mailService.sendVerificationEmail(
        user.email1,
        user.email1.split('@')[0],
        verifyToken,
      );
    } catch (err: any) {
      console.warn('SMTP resend verification email notice:', err?.message);
    }

    return {
      message: 'A new verification link has been sent to your email. Please check your inbox.',
    };
  }

  // ─── Login ───────────────────────────────────────────────────────────
  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email1: dto.email },
      include: {
        artistProfile: true,
        galleryProfile: true,
        artProfessionalProfile: true,
        collectorProfile: true,
      },
    });

    if (!user) throw new UnauthorizedException('Invalid email or password.');

    const passwordMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordMatch) throw new UnauthorizedException('Invalid email or password.');

    // 1. Email verification check
    if (!user.emailVerifiedAt) {
      throw new UnauthorizedException(
        'Please verify your email address before logging in. Check your inbox for the verification link.',
      );
    }

    // 2. Account status check: pending_verification
    if (user.status === 'pending_verification') {
      throw new UnauthorizedException(
        'Your account is pending verification. Please wait for admin approval before logging in.',
      );
    }

    // 3. Account status check: inactive
    if (user.status === 'inactive') {
      throw new UnauthorizedException(
        'Your account has been deactivated. Please contact support.',
      );
    }

    if (user.role === 'admin') {
      await this.prisma.adminAction.create({
        data: {
          adminId: user.id,
          actionType: 'ADMIN_LOGIN',
          notes: 'Administrator signed in successfully.',
        },
      });
      await this.notifications.deliver(user.id, {
        actorId: user.id,
        category: 'system',
        type: 'admin_login',
        title: 'Administrator sign-in',
        message: 'Your administrator account signed in successfully. If this was not you, change your password immediately.',
        link: '/admin/activity',
        preference: 'security',
        emailCategory: 'AUTH',
      });
    }

    const token = this.signToken(user.id, user.email1, user.role);
    return {
      access_token: token,
      user: this.sanitizeUser(user),
    };
  }

  // ─── Forgot Password ────────────────────────────────────────────────
  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email1: email } });
    if (!user) {
      return { message: 'If an account exists with that email, a reset link has been sent.' };
    }

    const resetToken = this.jwtService.sign(
      { sub: user.id, purpose: 'password_reset' },
      { expiresIn: '1h' },
    );

    try {
      await this.mailService.sendPasswordResetEmail(
        user.email1,
        user.email1.split('@')[0],
        resetToken,
      );
    } catch (err: any) {
      console.warn('SMTP password reset email notice:', err?.message);
    }

    return {
      message: 'Password reset link sent to your email.',
      dev_reset_token: resetToken,
      dev_reset_url: `${this.frontendUrl}/reset-password?token=${resetToken}`,
    };
  }

  // ─── Reset Password ──────────────────────────────────────────────────
  async resetPassword(dto: ResetPasswordDto) {
    let payload: { sub: string; purpose: string };
    try {
      payload = this.jwtService.verify(dto.token);
    } catch {
      throw new BadRequestException('Invalid or expired reset token.');
    }

    if (payload.purpose !== 'password_reset') {
      throw new BadRequestException('Invalid token purpose.');
    }

    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) throw new NotFoundException('User not found.');

    const passwordHash = await bcrypt.hash(dto.newPassword, 12);
    await this.prisma.user.update({
      where: { id: payload.sub },
      data: { passwordHash },
    });

    await this.notifications.deliver(user.id, {
      actorId: user.id,
      category: 'system',
      type: 'password_reset_completed',
      title: 'Password reset completed',
      message: 'Your THE PLINTH IQ password was reset successfully. If you did not make this change, contact support immediately.',
      link: this.settingsLink(user.role),
      preference: 'security',
      emailCategory: 'AUTH',
    });

    return { message: 'Password updated successfully. Please log in.' };
  }

  // ─── Get current user ────────────────────────────────────────────────
  async me(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: {
        artistProfile: true,
        galleryProfile: true,
        artProfessionalProfile: true,
        collectorProfile: true,
      },
    });
    return this.sanitizeUser(user);
  }

  // ─── Admin / Dev Helper: Update User Status & Verification ───────────
  async updateUserStatus(userId: string, dto: UpdateUserStatusDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found.');

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        status: dto.status,
        ...(dto.verificationStatus ? { verificationStatus: dto.verificationStatus } : {}),
      },
    });

    return {
      message: `User status updated to ${dto.status}.`,
      user: this.sanitizeUser(updated),
    };
  }

  // ─── Admin / Dev Helper: Activate User directly ──────────────────────
  async activateUser(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found.');

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        status: 'active',
        verificationStatus: 'verified',
        emailVerifiedAt: user.emailVerifiedAt || new Date(),
      },
    });

    return {
      message: 'User activated and verified successfully.',
      user: this.sanitizeUser(updated),
    };
  }

  // ─── Change Password ────────────────────────────────────────────────
  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found.');

    const isValid = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!isValid) {
      throw new BadRequestException('Current password is incorrect.');
    }

    if (dto.newPassword.length < 8) {
      throw new BadRequestException('New password must be at least 8 characters long.');
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, 12);
    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: { passwordHash },
      });
      if (user.role === 'admin') {
        await tx.adminAction.create({
          data: {
            adminId: user.id,
            actionType: 'ADMIN_PASSWORD_CHANGED',
            notes: 'Administrator changed their account password.',
          },
        });
      }
    });

    await this.notifications.deliver(user.id, {
      actorId: user.id,
      category: 'system',
      type: 'password_changed',
      title: 'Password changed',
      message: 'Your THE PLINTH IQ password was changed successfully. If you did not make this change, contact support immediately.',
      link: this.settingsLink(user.role),
      preference: 'security',
      emailCategory: 'AUTH',
    });

    return { message: 'Password changed successfully.' };
  }

  // ─── Update User Settings ───────────────────────────────────────────
  async updateSettings(userId: string, dto: UpdateSettingsDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found.');

    const currentSettings = (user.settings as Record<string, any>) || {};
    const displayName = dto.displayName?.trim();
    const currentNotifications =
      (currentSettings.notifications as Record<string, boolean> | undefined) || {};
    const currentPrivacy =
      (currentSettings.privacy as Record<string, any> | undefined) || {};
    const recordChanged = (
      current: Record<string, any>,
      incoming?: Record<string, any>,
    ) => Boolean(
      incoming &&
      Object.entries(incoming).some(([key, value]) => current[key] !== value),
    );

    const changedFields = [
      displayName && user.role === 'admin' && displayName !== currentSettings.displayName
        ? 'display name'
        : null,
      dto.language && dto.language !== currentSettings.language ? 'language' : null,
      dto.timeZone && dto.timeZone !== currentSettings.timeZone ? 'time zone' : null,
      dto.currency && dto.currency !== currentSettings.currency ? 'currency' : null,
      dto.measurementUnit && dto.measurementUnit !== currentSettings.measurementUnit
        ? 'measurement unit'
        : null,
      recordChanged(currentNotifications, dto.notifications) ? 'notifications' : null,
      recordChanged(currentPrivacy, dto.privacy) ? 'privacy' : null,
    ].filter((field): field is string => Boolean(field));

    if (changedFields.length === 0) {
      return {
        message: 'No settings changes detected.',
        settings: currentSettings,
      };
    }

    const mergedSettings = {
      ...currentSettings,
      ...(displayName && user.role === 'admin'
        ? { displayName }
        : {}),
      ...(dto.language ? { language: dto.language } : {}),
      ...(dto.timeZone ? { timeZone: dto.timeZone } : {}),
      ...(dto.currency ? { currency: dto.currency } : {}),
      ...(dto.measurementUnit ? { measurementUnit: dto.measurementUnit } : {}),
      ...(dto.notifications
        ? {
            notifications: {
              ...(currentSettings.notifications || {}),
              ...dto.notifications,
            },
          }
        : {}),
      ...(dto.privacy
        ? {
            privacy: {
              ...(currentSettings.privacy || {}),
              ...dto.privacy,
            },
          }
        : {}),
    };

    const updated = await this.prisma.$transaction(async (tx) => {
      const saved = await tx.user.update({
        where: { id: userId },
        data: { settings: mergedSettings },
      });
      if (user.role === 'admin') {
        await tx.adminAction.create({
          data: {
            adminId: user.id,
            actionType: 'ADMIN_SETTINGS_UPDATED',
            notes: `Administrator updated: ${changedFields.join(', ')}.`,
          },
        });
      }
      return saved;
    });

    return {
      message: 'Settings updated successfully.',
      settings: updated.settings,
    };
  }

  private settingsLink(role: UserRole) {
    if (role === 'gallery') return '/galleries/settings';
    if (role === 'art_professional') return '/art-professionals/settings';
    if (role === 'collector') return '/collectors/settings';
    if (role === 'admin') return '/admin/settings';
    return '/artists/settings';
  }

  // ─── Get User Settings ──────────────────────────────────────────────
  async getSettings(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { settings: true },
    });
    if (!user) throw new NotFoundException('User not found.');

    return {
      settings: (user.settings as Record<string, any>) || {},
    };
  }

  // ─── Delete / Deactivate Account ────────────────────────────────────
  async deleteAccount(userId: string, dto: DeleteAccountDto) {
    if (dto.confirmation !== 'DELETE') {
      throw new BadRequestException('Please type DELETE to confirm account deactivation.');
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found.');
    if (user.role === 'admin') {
      throw new BadRequestException('Administrator accounts cannot be self-deactivated.');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { status: 'inactive' },
    });

    return { message: 'Your account has been deactivated successfully.' };
  }

  // ─── Helpers ────────────────────────────────────────────────────────
  private signToken(userId: string, email: string, role: UserRole) {
    return this.jwtService.sign({
      sub: userId,
      email,
      role,
    });
  }

  private sanitizeUser(user: any) {
    const { passwordHash, ...rest } = user;
    const settings = user.settings as Record<string, any> | null;
    const resolvedFullName = user.role === 'admin'
      ? settings?.displayName || user.email1?.split('@')[0]
      : user.role === 'artist'
        ? user.artistProfile?.fullName || user.artistProfile?.workingName
        : user.role === 'gallery'
          ? user.galleryProfile?.directorName || user.galleryProfile?.galleryName
          : user.role === 'art_professional'
            ? user.artProfessionalProfile?.displayName
            : user.role === 'collector'
              ? user.collectorProfile?.realName || user.collectorProfile?.displayHandle
              : undefined;

    const resolvedPhotoUrl =
      user.artistProfile?.photoUrl ||
      user.collectorProfile?.photoUrl ||
      user.artProfessionalProfile?.photoUrl ||
      user.galleryProfile?.logoUrl ||
      undefined;

    const resolvedCountry =
      user.artistProfile?.country ||
      user.galleryProfile?.locations?.[0]?.country ||
      undefined;

    return {
      ...rest,
      email: user.email1,
      fullName: resolvedFullName,
      photoUrl: resolvedPhotoUrl,
      country: resolvedCountry,
      onboarding_completed: Boolean(user.onboardingCompleted),
    };
  }
}
