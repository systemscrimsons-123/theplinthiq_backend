import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
} from 'class-validator';

export class MailAttachmentDto {
  @IsString()
  @IsNotEmpty()
  filename: string;

  @IsOptional()
  content?: string;

  @IsString()
  @IsOptional()
  path?: string;

  @IsString()
  @IsOptional()
  contentType?: string;

  @IsString()
  @IsOptional()
  cid?: string;
}

export class SendCustomMailDto {
  @IsNotEmpty()
  to: string | string[];

  @IsOptional()
  cc?: string | string[];

  @IsOptional()
  bcc?: string | string[];

  @IsString()
  @IsNotEmpty()
  subject: string;

  @IsString()
  @IsOptional()
  text?: string;

  @IsString()
  @IsOptional()
  html?: string;

  @IsArray()
  @IsOptional()
  attachments?: MailAttachmentDto[];
}

export class TestMailDto {
  @IsString()
  @IsNotEmpty()
  to: string;
}

