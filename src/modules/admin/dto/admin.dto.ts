import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  IsNotEmpty,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  UserRole,
  AccountStatus,
  VerificationStatus,
  BriefType,
  BriefStatus,
  PitchStatus,
  RequestType,
  RequestStatus,
} from '@prisma/client';

export class UpdateUserStatusDto {
  @IsEnum(AccountStatus)
  status: AccountStatus;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class QueryUsersDto {
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @IsOptional()
  @IsEnum(AccountStatus)
  status?: AccountStatus;

  @IsOptional()
  @IsEnum(VerificationStatus)
  verificationStatus?: VerificationStatus;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit?: number = 20;
}

export class UpdatePermissionDto {
  @IsEnum(UserRole)
  fromRole: UserRole;

  @IsEnum(UserRole)
  toRole: UserRole;

  @IsString()
  @IsNotEmpty()
  @IsIn(['open', 'request_only', 'pitch_only', 'blocked'])
  mode: string; // 'open' | 'request_only' | 'pitch_only' | 'blocked'
}

export class UpdateBriefStatusDto {
  @IsEnum(BriefStatus)
  status: BriefStatus;
}

export class QueryAdminBriefsDto {
  @IsOptional()
  @IsEnum(BriefType)
  briefType?: BriefType;

  @IsOptional()
  @IsEnum(BriefStatus)
  status?: BriefStatus;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit?: number = 20;
}

export class QueryAdminPitchesDto {
  @IsOptional()
  @IsString()
  briefId?: string;

  @IsOptional()
  @IsEnum(PitchStatus)
  status?: PitchStatus;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit?: number = 20;
}

export class QueryAdminRequestsDto {
  @IsOptional()
  @IsEnum(RequestType)
  requestType?: RequestType;

  @IsOptional()
  @IsEnum(RequestStatus)
  status?: RequestStatus;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit?: number = 20;
}

export class QueryActivityDto {
  @IsOptional()
  @IsString()
  actionType?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit?: number = 20;
}
