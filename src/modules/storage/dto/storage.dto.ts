import { IsString, IsNotEmpty, IsOptional, IsNumber, Min } from 'class-validator';

export class GetPresignedUrlDto {
  @IsString()
  @IsNotEmpty()
  filename!: string;

  @IsString()
  @IsNotEmpty()
  mimeType!: string;

  @IsString()
  @IsOptional()
  folder?: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  fileSize?: number;
}

export class ConfirmUploadDto {
  @IsString()
  @IsNotEmpty()
  key!: string;

  @IsString()
  @IsOptional()
  assetId?: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  size?: number;
}

