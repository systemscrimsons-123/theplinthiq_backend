import {
  IsString,
  IsOptional,
  IsBoolean,
  IsArray,
  MaxLength,
  IsEnum,
  IsInt,
  IsIn,
  IsNotEmpty,
  IsUUID,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CareerStage, CollectingIntent } from '@prisma/client';

export class QueryCollectorsDto {
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
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}

export class UpdateCollectorProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  displayHandle?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  realName?: string;

  @IsOptional()
  @IsBoolean()
  isPseudonymous?: boolean;

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
  photoUrl?: string;

  @IsOptional()
  @IsString()
  bio?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  websiteUrl?: string;

  @IsOptional()
  @IsString()
  privacyTier?: string;

  @IsOptional()
  @IsBoolean()
  allowDirectInquiries?: boolean;

  @IsString()
  @IsOptional()
  bannerUrl?: string;

  @IsString()
  @IsOptional()
  collectorType?: string;

  @IsString()
  @IsOptional()
  collectingSince?: string;

  @IsString()
  @IsOptional()
  curatorialStatement?: string;

  @IsArray()
  @IsOptional()
  collectingEras?: string[];

  @IsArray()
  @IsOptional()
  spatialContexts?: string[];

  @IsString()
  @IsOptional()
  instagramHandle?: string;

  @IsString()
  @IsOptional()
  linkedinHandle?: string;


  @IsOptional()
  privacySettings?: Record<string, any>;

  @IsOptional()
  @IsArray()
  interests?: string[]; // Taxonomy labels

  @IsOptional()
  @IsArray()
  mediums?: string[]; // Taxonomy medium labels

  @IsOptional()
  @IsArray()
  interestIds?: string[]; // Taxonomy IDs

  @IsOptional()
  @IsArray()
  careerPrefs?: CareerStage[];

  @IsOptional()
  @IsArray()
  intents?: CollectingIntent[];

  // User Contact info
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

export class CreateCollectionDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsIn(['collection', 'moodboard', 'private_viewing'])
  collectionType?: 'collection' | 'moodboard' | 'private_viewing';
}

export class UpdateCollectionDto {
  @IsOptional()
  @IsString()
  @MaxLength(150)
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsIn(['collection', 'moodboard', 'private_viewing'])
  collectionType?: 'collection' | 'moodboard' | 'private_viewing';
}

export class AddCollectionItemDto {
  @IsUUID()
  portfolioItemId: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  note?: string;
}
