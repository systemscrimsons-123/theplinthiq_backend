import { IsString, IsNotEmpty, IsOptional, MaxLength } from 'class-validator';

export class CreateShortlistDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}

export class AddShortlistArtistDto {
  @IsString()
  @IsNotEmpty()
  artistId: string;
}
