import {
  IsString, IsOptional, IsEnum, IsArray, IsDateString, MaxLength, IsBoolean,
} from 'class-validator';
import { BriefType, BriefStatus, CareerStage, ScaleRange } from '@prisma/client';

export class CreateBriefDto {
  @IsEnum(BriefType) briefType: BriefType;
  @IsString() @MaxLength(200) title: string;
  @IsString() description: string;

  @IsOptional() @IsString() @MaxLength(100) opportunityType?: string;
  @IsOptional() @IsString() @MaxLength(200) exhibitionTheme?: string;
  @IsOptional() @IsArray() @IsEnum(CareerStage, { each: true }) requiredCareerStages?: CareerStage[];
  @IsOptional() @IsArray() @IsEnum(ScaleRange, { each: true }) scaleRequirements?: ScaleRange[];
  @IsOptional() @IsArray() mediumIds?: string[];
  @IsOptional() @IsString() @MaxLength(150) location?: string;
  @IsOptional() @IsDateString() submissionDeadline?: string;
  @IsOptional() @IsDateString() eventStartDate?: string;
  @IsOptional() @IsDateString() eventEndDate?: string;
  @IsOptional() @IsString() artistRequirements?: string;
  @IsOptional() @IsString() additionalInfo?: string;
  @IsOptional() @IsEnum(BriefStatus) status?: BriefStatus;
  @IsOptional() @IsArray() @IsString({ each: true }) imageUrls?: string[];
}

export class UpdateBriefDto {
  @IsOptional() @IsEnum(BriefType) briefType?: BriefType;
  @IsOptional() @IsString() @MaxLength(200) title?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() @MaxLength(100) opportunityType?: string;
  @IsOptional() @IsString() @MaxLength(200) exhibitionTheme?: string;
  @IsOptional() @IsArray() @IsEnum(CareerStage, { each: true }) requiredCareerStages?: CareerStage[];
  @IsOptional() @IsArray() @IsEnum(ScaleRange, { each: true }) scaleRequirements?: ScaleRange[];
  @IsOptional() @IsArray() mediumIds?: string[];
  @IsOptional() @IsString() @MaxLength(150) location?: string;
  @IsOptional() @IsDateString() submissionDeadline?: string;
  @IsOptional() @IsDateString() eventStartDate?: string;
  @IsOptional() @IsDateString() eventEndDate?: string;
  @IsOptional() @IsString() artistRequirements?: string;
  @IsOptional() @IsString() additionalInfo?: string;
  @IsOptional() @IsEnum(BriefStatus) status?: BriefStatus;
  @IsOptional() @IsArray() @IsString({ each: true }) imageUrls?: string[];
}

export class SubmitPitchDto {
  @IsString() statement: string;
  @IsOptional() @IsArray() portfolioItemIds?: string[];
  @IsOptional() @IsBoolean() isDraft?: boolean;
}


