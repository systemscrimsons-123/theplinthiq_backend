import {
  IsString,
  IsOptional,
  IsEnum,
  IsArray,
  MaxLength,
  IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ProfessionalSubType, CareerStage, ScaleRange } from '@prisma/client';

export class UpdateArtProfessionalProfileDto {
  @IsOptional()
  @IsEnum(ProfessionalSubType)
  subType?: ProfessionalSubType;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  displayName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  workingName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  jobTitle?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  yearsExperience?: string;

  @IsOptional()
  @IsString()
  photoUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  organisation?: string;

  @IsOptional()
  @IsString()
  biography?: string;

  @IsOptional()
  @IsString()
  backgroundText?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  stateRegion?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  country?: string;

  @IsOptional()
  @IsString()
  websiteUrl?: string;

  @IsOptional()
  @IsString()
  whyJoined?: string;

  @IsOptional()
  @IsString()
  whatDrives?: string;

  @IsOptional()
  @IsString()
  currentFocus?: string;

  @IsOptional()
  @IsString()
  additionalInterests?: string;

  @IsOptional()
  socialLinks?: Record<string, string>;

  @IsOptional()
  @IsArray()
  interests?: string[]; // Taxonomy term labels

  @IsOptional()
  @IsArray()
  interestIds?: string[]; // Taxonomy term IDs

  // Contact info
  @IsOptional()
  @IsString()
  contactEmail1?: string;

  @IsOptional()
  @IsString()
  contactEmail2?: string;

  @IsOptional()
  @IsString()
  contactPhone1?: string;

  @IsOptional()
  @IsString()
  contactPhone2?: string;
}

export class UpdateArtProfessionalPreferencesDto {
  @IsOptional()
  @IsArray()
  preferredCareerStages?: CareerStage[];

  @IsOptional()
  @IsArray()
  preferredScale?: ScaleRange[];

  @IsOptional()
  @IsString()
  @MaxLength(150)
  preferredLocation?: string;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsArray()
  mediums?: string[]; // Taxonomy term labels

  @IsOptional()
  @IsArray()
  mediumIds?: string[]; // Taxonomy term IDs
}

export class QueryArtProfessionalsDto {
  @IsOptional()
  @IsEnum(ProfessionalSubType)
  subType?: ProfessionalSubType;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsString()
  interest?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit?: number = 20;
}

