import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsArray,
  MaxLength,
  IsNumber,
  IsDateString,
  ValidateNested,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { SpaceType, OpenCallStatus, CareerStage } from '@prisma/client';

export class GalleryLocationDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  streetAddress?: string;

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
  @MaxLength(20)
  postcode?: string;

  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}

export class UpdateGalleryProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  galleryName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  alsoKnownAs?: string;

  @IsOptional()
  @IsString()
  logoUrl?: string;

  @IsOptional()
  @IsString()
  coverImageUrl?: string;

  @IsOptional()
  @IsEnum(SpaceType)
  spaceType?: SpaceType;

  @IsOptional()
  @IsNumber()
  yearEstablished?: number;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  numberOfLocations?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  directorName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  directorEmail?: string;

  @IsOptional()
  @IsString()
  ethosStatement?: string;

  @IsOptional()
  @IsString()
  mission?: string;

  @IsOptional()
  @IsEnum(OpenCallStatus)
  openCallStatus?: OpenCallStatus;

  @IsOptional()
  @IsBoolean()
  visitPolicyEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  directOutreachEnabled?: boolean;

  @IsOptional()
  @IsString()
  websiteUrl?: string;

  @IsOptional()
  socialLinks?: Record<string, string>;

  @IsOptional()
  @ValidateNested()
  @Type(() => GalleryLocationDto)
  location?: GalleryLocationDto;

  @IsOptional()
  @IsArray()
  locations?: GalleryLocationDto[];

  @IsOptional()
  @IsArray()
  mediums?: string[]; // Taxonomy term labels or IDs

  @IsOptional()
  @IsArray()
  mediumIds?: string[];

  @IsOptional()
  @IsArray()
  targetStages?: CareerStage[];

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

export class AddRosterArtistDto {
  @IsString()
  artistId: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  representationType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  status?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  note?: string;
}

export class UpdateRosterStatusDto {
  @IsString()
  @MaxLength(30)
  status: string;
}

export class CreateExhibitionDto {
  @IsString()
  @MaxLength(200)
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  exhibitionType?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  participatingArtists?: string[];

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}

export class UpdateExhibitionDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  exhibitionType?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  participatingArtists?: string[];

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}

export class QueryGalleriesDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(SpaceType)
  spaceType?: SpaceType;

  @IsOptional()
  @IsEnum(OpenCallStatus)
  openCallStatus?: OpenCallStatus;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
  @IsArray()
  @IsString({ each: true })
  medium?: string[];

  @IsOptional()
  @IsEnum(CareerStage)
  targetCareerStage?: CareerStage;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit?: number = 20;
}
