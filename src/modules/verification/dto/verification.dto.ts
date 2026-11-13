import { IsString, IsOptional, IsEnum, IsObject, Allow } from 'class-validator';
import { VerificationStatus } from '@prisma/client';

export class SubmitVerificationDto {
  @IsOptional()
  @IsString()
  evidenceUrl?: string;

  @IsOptional()
  @IsString()
  evidenceNotes?: string;

  @IsOptional()
  @Allow()
  @IsObject()
  evidenceDetails?: Record<string, any>;
}

export class ReviewVerificationDto {
  @IsEnum(VerificationStatus, {
    message: 'Decision must be verified or rejected',
  })
  decision: VerificationStatus;

  @IsOptional()
  @IsString()
  reviewerNotes?: string;
}

export class SubmitSupportInquiryDto {
  @IsString()
  message: string;
}

