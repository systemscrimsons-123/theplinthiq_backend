import {
  IsString, IsNotEmpty, IsOptional, IsEnum, IsUrl, IsArray, MaxLength, ValidateNested, IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CareerStage, RepresentationStatus, PlatformIntent, ScaleRange, CvEntryType } from '@prisma/client';

export class UpsertArtistProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(150)
  fullName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  workingName?: string;

  @IsOptional()
  @IsString()
  photoUrl?: string;

  @IsOptional()
  @IsString()
  bannerUrl?: string;

  @IsOptional() @IsString() @MaxLength(100) city?: string;
  @IsOptional() @IsString() @MaxLength(100) stateRegion?: string;
  @IsOptional() @IsString() @MaxLength(100) country?: string;

  @IsOptional() @IsString() careerStage?: string;

  @IsOptional()
  websiteUrl?: string;

  @IsOptional() socialLinks?: Record<string, string>;

  @IsOptional() @IsString() artistStatement?: string;
  @IsOptional() @IsString() biography?: string;

  @IsOptional() @IsString() representationStatus?: string;
  @IsOptional() @IsString() @MaxLength(200) availabilityStatus?: string;
  @IsOptional() @IsString() @MaxLength(500) currentFocus?: string;
  @IsOptional() @IsArray() preferredLocations?: string[];
  @IsOptional() @IsString() @MaxLength(500) additionalNotes?: string;
  @IsOptional() cvDocumentUrl?: string;
  @IsOptional() pitchPackage?: Record<string, any>;

  @IsOptional() @IsArray() mediumIds?: string[];
  @IsOptional() @IsArray() mediums?: string[];
  @IsOptional() @IsArray() materialTags?: string[];
  @IsOptional() @IsArray() scaleRanges?: string[];

  @IsOptional() @IsArray() aesthetics?: string[];

  @IsOptional() @IsArray() platformIntents?: string[];
  @IsOptional() @IsString() platformIntentOther?: string;

  // Contact Info (stored on User model)
  @IsOptional() @IsString() contactEmail1?: string;
  @IsOptional() @IsString() contactEmail2?: string;
  @IsOptional() @IsString() contactPhone1?: string;
  @IsOptional() @IsString() contactPhone2?: string;
}

export class AddAestheticDto {
  @IsOptional() aestheticId?: string;
  @IsOptional() @IsString() @MaxLength(100) customLabel?: string;
}

export class AddPortfolioItemDto {
  @IsString()
  @IsNotEmpty()
  imageUrl: string;

  @IsOptional() @IsString() @MaxLength(200) title?: string;
  @IsOptional() year?: number;
  @IsOptional() @IsString() @MaxLength(150) medium?: string;
  @IsOptional() @IsString() @MaxLength(100) dimensions?: string;
  @IsOptional() @IsString() contextNotes?: string;
  @IsOptional() isPublic?: boolean;
  @IsOptional() sortOrder?: number;
}

export class UpdatePortfolioItemDto {
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional() @IsString() @MaxLength(200) title?: string;
  @IsOptional() year?: number;
  @IsOptional() @IsString() @MaxLength(150) medium?: string;
  @IsOptional() @IsString() @MaxLength(100) dimensions?: string;
  @IsOptional() @IsString() contextNotes?: string;
  @IsOptional() isPublic?: boolean;
  @IsOptional() sortOrder?: number;
}

export class AddCvEntryDto {
  @IsEnum(CvEntryType) entryType: CvEntryType;

  @IsString() @MaxLength(200) title: string;

  @IsOptional() @IsString() @MaxLength(200) organisation?: string;
  @IsOptional() year?: number;
  @IsOptional() @IsString() description?: string;
}

export class QueryArtistsDto {
  @IsOptional()
  @IsString()
  careerStage?: string;

  @IsOptional()
  @IsString()
  medium?: string;

  @IsOptional()
  @IsString()
  country?: string;

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

