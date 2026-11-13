import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
  IsBoolean,
  MaxLength,
} from 'class-validator';
import { UserRole, AccountStatus, VerificationStatus } from '@prisma/client';

export class SignupDto {
  @IsEmail({}, { message: 'Please provide a valid email address.' })
  email: string;

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters.' })
  password: string;

  @IsEnum(UserRole, {
    message: 'Role must be one of: artist, gallery, art_professional, collector',
  })
  role: UserRole;

  @IsOptional()
  @IsString()
  fullName?: string;

  @IsOptional()
  @IsString()
  country?: string;
}

export class LoginDto {
  @IsEmail({}, { message: 'Please provide a valid email address.' })
  email: string;

  @IsString()
  @IsNotEmpty({ message: 'Password is required.' })
  password: string;
}

export class VerifyEmailDto {
  @IsString({ message: 'Verification token is required.' })
  @IsNotEmpty()
  token: string;

  @IsOptional()
  @IsBoolean()
  activateImmediately?: boolean;
}

export class ResendVerificationDto {
  @IsEmail({}, { message: 'Please provide a valid email address.' })
  email: string;
}

export class ForgotPasswordDto {
  @IsEmail({}, { message: 'Please provide a valid email address.' })
  email: string;
}

export class ResetPasswordDto {
  @IsString()
  @IsNotEmpty()
  token: string;

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters.' })
  newPassword: string;
}

export class UpdateUserStatusDto {
  @IsEnum(AccountStatus, {
    message: 'Status must be one of: active, inactive, pending_verification',
  })
  status: AccountStatus;

  @IsOptional()
  @IsEnum(VerificationStatus)
  verificationStatus?: VerificationStatus;
}

export class ChangePasswordDto {
  @IsString()
  @IsNotEmpty({ message: 'Current password is required.' })
  currentPassword: string;

  @IsString()
  @MinLength(8, { message: 'New password must be at least 8 characters.' })
  newPassword: string;
}

export class UpdateSettingsDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  displayName?: string;

  @IsOptional()
  @IsString()
  language?: string;

  @IsOptional()
  @IsString()
  timeZone?: string;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsString()
  measurementUnit?: string;

  @IsOptional()
  notifications?: Record<string, boolean>;

  @IsOptional()
  privacy?: Record<string, any>;
}

export class DeleteAccountDto {
  @IsString()
  @IsNotEmpty({ message: 'Confirmation is required.' })
  confirmation: string;
}
