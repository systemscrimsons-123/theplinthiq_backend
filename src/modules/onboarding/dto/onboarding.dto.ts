import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsArray,
  IsObject,
  IsInt,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  CareerStage,
  ScaleRange,
  RepresentationStatus,
  PlatformIntent,
  SpaceType,
  OpenCallStatus,
  ProfessionalSubType,
  CollectingIntent,
} from '@prisma/client';

export class GalleryLocationInputDto {
  @IsOptional()
  @IsString()
  streetAddress?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  stateRegion?: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsString()
  postcode?: string;
}

export class ArtistSampleArtworkDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  year?: number | string;

  @IsOptional()
  @IsString()
  medium?: string;

  @IsOptional()
  @IsString()
  dimensions?: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @IsString()
  contextNotes?: string;
}

export class ArtistOnboardingDto {
  @IsString()
  workingName: string;

  @IsOptional()
  @IsString()
  fullName?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  stateRegion?: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsEnum(CareerStage)
  careerStage?: CareerStage;

  @IsOptional()
  @IsString()
  biography?: string;

  @IsOptional()
  @IsString()
  artistStatement?: string;

  @IsOptional()
  @IsEnum(RepresentationStatus)
  representationStatus?: RepresentationStatus;

  @IsOptional()
  @IsString()
  availabilityStatus?: string;

  @IsOptional()
  @IsString()
  photoUrl?: string;

  @IsOptional()
  @IsString()
  websiteUrl?: string;

  @IsOptional()
  @IsObject()
  socialLinks?: Record<string, any>;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  mediums?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  primaryMediums?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  materials?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  primaryMaterials?: string[];

  @IsOptional()
  @IsArray()
  @IsEnum(ScaleRange, { each: true })
  scaleRanges?: ScaleRange[];

  @IsOptional()
  @IsArray()
  @IsEnum(ScaleRange, { each: true })
  primaryScale?: ScaleRange[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  aesthetics?: string[];

  @IsOptional()
  @IsArray()
  @IsEnum(PlatformIntent, { each: true })
  platformIntents?: PlatformIntent[];

  @IsOptional()
  @IsArray()
  @IsEnum(PlatformIntent, { each: true })
  commercialIntent?: PlatformIntent[];

  @IsOptional()
  @IsObject()
  sampleArtwork?: ArtistSampleArtworkDto;

  @IsOptional()
  @IsString()
  education?: string;

  @IsOptional()
  @IsString()
  exhibitions?: string;

  @IsOptional()
  @IsString()
  awards?: string;

  @IsOptional()
  @IsArray()
  cvEntries?: Array<any>;

  @IsOptional()
  @IsString()
  evidenceUrl?: string;

  @IsOptional()
  @IsString()
  evidenceNotes?: string;

  @IsOptional()
  @IsString()
  email2?: string;

  @IsOptional()
  @IsString()
  phone1?: string;

  @IsOptional()
  @IsString()
  phone2?: string;

  @IsOptional()
  @IsBoolean()
  isDraft?: boolean;
}

export class GalleryOnboardingDto {
  @IsString()
  galleryName: string;

  @IsOptional()
  @IsEnum(SpaceType)
  spaceType?: SpaceType;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  yearEstablished?: number;

  @IsOptional()
  @IsString()
  numberOfLocations?: string;

  @IsOptional()
  @IsString()
  directorName?: string;

  @IsOptional()
  @IsString()
  directorEmail?: string;

  @IsOptional()
  @IsString()
  ethosStatement?: string;

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
  @IsObject()
  @ValidateNested()
  @Type(() => GalleryLocationInputDto)
  location?: GalleryLocationInputDto;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => GalleryLocationInputDto)
  primaryLocation?: GalleryLocationInputDto;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  mediums?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  mediumsRepresented?: string[];

  @IsOptional()
  @IsArray()
  @IsEnum(CareerStage, { each: true })
  targetStages?: CareerStage[];

  @IsOptional()
  @IsString()
  evidenceUrl?: string;

  @IsOptional()
  @IsString()
  evidenceNotes?: string;

  @IsOptional()
  @IsString()
  email2?: string;

  @IsOptional()
  @IsString()
  phone1?: string;

  @IsOptional()
  @IsString()
  phone2?: string;

  @IsOptional()
  @IsString()
  logoUrl?: string;

  @IsOptional()
  @IsString()
  coverImageUrl?: string;

  @IsOptional()
  @IsString()
  overview?: string;

  @IsOptional()
  @IsString()
  mission?: string;

  @IsOptional()
  @IsString()
  galleryType?: string;

  @IsOptional()
  @IsString()
  alsoKnownAs?: string;

  @IsOptional()
  @IsObject()
  socialLinks?: Record<string, any>;

  @IsOptional()
  @IsString()
  representedArtistsCount?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  initialArtists?: string[];
}

export class ArtProfessionalOnboardingDto {
  @IsOptional()
  @IsEnum(ProfessionalSubType)
  subType?: ProfessionalSubType;

  @IsOptional()
  @IsEnum(ProfessionalSubType)
  professionalType?: ProfessionalSubType;

  @IsOptional()
  @IsString()
  displayName?: string;

  @IsOptional()
  @IsString()
  fullName?: string;

  @IsOptional()
  @IsString()
  workingName?: string;

  @IsOptional()
  @IsString()
  organisation?: string;

  @IsOptional()
  @IsString()
  organization?: string;

  @IsOptional()
  @IsString()
  jobTitle?: string;

  @IsOptional()
  @IsString()
  yearsExperience?: string;

  @IsOptional()
  @IsString()
  biography?: string;

  @IsOptional()
  @IsString()
  backgroundText?: string;

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
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  stateRegion?: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsString()
  websiteUrl?: string;

  @IsOptional()
  @IsString()
  photoUrl?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  interests?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  mediums?: string[];

  @IsOptional()
  @IsArray()
  @IsEnum(CareerStage, { each: true })
  preferredCareerStages?: CareerStage[];

  @IsOptional()
  @IsArray()
  @IsEnum(ScaleRange, { each: true })
  preferredScale?: ScaleRange[];

  @IsOptional()
  @IsString()
  preferredLocation?: string;

  @IsOptional()
  @IsString()
  opportunityNote?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  preferredMediums?: string[];

  @IsOptional()
  @IsString()
  email2?: string;

  @IsOptional()
  @IsString()
  phone1?: string;

  @IsOptional()
  @IsString()
  phone2?: string;

  @IsOptional()
  @IsString()
  instagramUrl?: string;

  @IsOptional()
  @IsString()
  linkedinUrl?: string;

  @IsOptional()
  @IsString()
  xLink?: string;

  @IsOptional()
  @IsString()
  twitterUrl?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  areasOfInterest?: string[];

  @IsOptional()
  @IsString()
  evidenceUrl?: string;

  @IsOptional()
  @IsString()
  evidenceNotes?: string;
}

export class CollectorOnboardingDto {
  @IsOptional()
  @IsString()
  displayHandle?: string;

  @IsOptional()
  @IsString()
  displayName?: string;

  @IsOptional()
  @IsString()
  realName?: string;

  @IsOptional()
  @IsBoolean()
  isPseudonymous?: boolean;

  @IsOptional()
  @IsString()
  photoUrl?: string;

  @IsOptional()
  @IsString()
  bio?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  stateRegion?: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsString()
  websiteUrl?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  interests?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  mediums?: string[];

  @IsOptional()
  @IsArray()
  @IsEnum(CareerStage, { each: true })
  careerStagePrefs?: CareerStage[];

  @IsOptional()
  @IsArray()
  @IsEnum(CollectingIntent, { each: true })
  intents?: CollectingIntent[];

  @IsOptional()
  @IsString()
  privacyTier?: string;

  @IsOptional()
  @IsBoolean()
  allowDirectInquiries?: boolean;

  @IsOptional()
  privacySettings?: Record<string, any>;

  @IsOptional()
  @IsString()
  email2?: string;

  @IsOptional()
  @IsString()
  phone1?: string;

  @IsOptional()
  @IsString()
  phone2?: string;
}
