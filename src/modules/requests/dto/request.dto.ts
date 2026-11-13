import {
  IsString,
  IsOptional,
  IsEnum,
  IsNotEmpty,
  MaxLength,
  IsDateString,
  IsArray,
} from 'class-validator';
import { RequestType, RequestStatus, VisitStatus } from '@prisma/client';

export class CreateRequestDto {
  @IsString()
  @IsNotEmpty()
  recipientId: string;

  @IsEnum(RequestType)
  requestType: RequestType;

  @IsOptional()
  @IsString()
  message?: string;

  // Additional fields for Visit requests
  @IsOptional()
  @IsDateString()
  requestedDate?: string;

  @IsOptional()
  @IsString()
  requestedTime?: string;

  @IsOptional()
  @IsString()
  @MaxLength(250)
  location?: string;

  @IsOptional()
  @IsString()
  purpose?: string;

  // Additional fields for PVR requests (optional specific artwork IDs)
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  portfolioItemIds?: string[];
}

export class RespondRequestDto {
  @IsEnum(RequestStatus)
  status: RequestStatus;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  declineReason?: string;

  @IsOptional()
  @IsString()
  declineFeedback?: string;

  // Optional for PVR acceptance: specific private artwork IDs granted
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  grantedPortfolioItemIds?: string[];
}

export class WithdrawRequestDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  declineReason?: string;

  @IsOptional()
  @IsString()
  declineFeedback?: string;
}

export class ScheduleVisitDto {
  @IsDateString()
  confirmedDate: string;

  @IsOptional()
  @IsString()
  confirmedTime?: string;

  @IsOptional()
  @IsString()
  @MaxLength(250)
  location?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsEnum(VisitStatus)
  status?: VisitStatus;
}

export class UpdatePvrArtworksDto {
  @IsArray()
  @IsString({ each: true })
  portfolioItemIds: string[];
}

export class SharePvrDocumentDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  url: string;

  @IsOptional()
  @IsString()
  size?: string;

  @IsOptional()
  @IsString()
  type?: string;
}

export class UpdatePvrNotesDto {
  @IsString()
  notes: string;
}

export class UpdatePvrStatusDto {
  isActive: boolean;
}
