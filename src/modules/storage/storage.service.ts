import { Injectable, Logger, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { PrismaService } from '../../prisma/prisma.service';
import { GetPresignedUrlDto, ConfirmUploadDto } from './dto/storage.dto';
import * as fs from 'fs';
import * as path from 'path';

export interface PresignedUrlResult {
  uploadUrl: string;
  publicUrl: string;
  key: string;
  assetId: string;
  isDirectR2: boolean;
}

export interface UploadResult {
  url: string;
  key: string;
  size: number;
  mimeType: string;
  originalName: string;
  assetId?: string;
}

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private s3Client: S3Client | null = null;
  private readonly accountId: string;
  private readonly accessKeyId: string;
  private readonly secretAccessKey: string;
  private readonly bucketName: string;
  private readonly publicUrl: string;
  private readonly isConfigured: boolean;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.accountId = (this.config.get<string>('R2_ACCOUNT_ID') || '').trim();
    this.accessKeyId = (this.config.get<string>('R2_ACCESS_KEY_ID') || '').trim();
    this.secretAccessKey = (this.config.get<string>('R2_SECRET_ACCESS_KEY') || '').trim();
    this.bucketName = (this.config.get<string>('R2_BUCKET_NAME') || 'plinth-storage').trim();
    this.publicUrl = (this.config.get<string>('R2_PUBLIC_URL') || '').trim().replace(/\/+$/, '');

    this.isConfigured = Boolean(this.accountId && this.accessKeyId && this.secretAccessKey);

    if (this.isConfigured) {
      this.s3Client = new S3Client({
        region: 'auto',
        endpoint: `https://${this.accountId}.r2.cloudflarestorage.com`,
        credentials: {
          accessKeyId: this.accessKeyId,
          secretAccessKey: this.secretAccessKey,
        },
      });
      this.logger.log(`Cloudflare R2 Storage initialized for bucket: "${this.bucketName}"`);
    } else {
      this.logger.warn(
        'Cloudflare R2 credentials not configured. Operating in local fallback mode (backend/uploads/).',
      );
      const uploadsDir = path.join(process.cwd(), 'uploads');
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }
    }
  }

  /**
   * Returns the public CDN / custom domain URL if configured,
   * or falls back to backend streaming endpoint so files are always viewable.
   */
  getResolvedPublicUrl(key: string): string {
    if (this.publicUrl && !this.publicUrl.includes('r2.cloudflarestorage.com')) {
      return `${this.publicUrl}/${key}`;
    }
    const port = this.config.get<number>('PORT') || 3001;
    const apiUrl = this.config.get<string>('API_URL') || `http://localhost:${port}/api`;
    return `${apiUrl.replace(/\/+$/, '')}/storage/file/${key}`;
  }

  /**
   * Generates a pre-signed PUT URL for direct client-to-R2 upload
   * and registers the asset as "pending" in the database.
   */
  async getPresignedPutUrl(userId: string, dto: GetPresignedUrlDto): Promise<PresignedUrlResult> {
    const cleanFolder = (dto.folder || 'media')
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, '') || 'media';
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    const sanitizedName = (dto.filename || 'file')
      .toLowerCase()
      .replace(/[^a-z0-9.-]/g, '_');

    const key = `${cleanFolder}/${userId}/${timestamp}-${randomSuffix}-${sanitizedName}`;
    const publicUrl = this.getResolvedPublicUrl(key);

    if (this.isConfigured && this.s3Client) {
      try {
        const command = new PutObjectCommand({
          Bucket: this.bucketName,
          Key: key,
          ContentType: dto.mimeType || 'application/octet-stream',
          CacheControl: 'max-age=31536000, public, immutable',
        });

        // 15-minute expiration for pre-signed direct upload
        const uploadUrl = await getSignedUrl(this.s3Client, command, { expiresIn: 900 });

        // Track pending upload in database
        const asset = await this.prisma.uploadedAsset.create({
          data: {
            userId,
            key,
            url: publicUrl,
            filename: dto.filename,
            mimeType: dto.mimeType || 'application/octet-stream',
            size: dto.fileSize || null,
            folder: cleanFolder,
            status: 'pending',
          },
        });

        this.logger.log(`Generated direct R2 presigned PUT URL for key: ${key} (user: ${userId})`);

        return {
          uploadUrl,
          publicUrl,
          key,
          assetId: asset.id,
          isDirectR2: true,
        };
      } catch (err: any) {
        this.logger.error(`Failed to generate R2 presigned URL: ${err.message}`, err.stack);
        throw new BadRequestException(`Cloudflare R2 presign error: ${err.message}`);
      }
    } else {
      // Local dev fallback
      const port = this.config.get<number>('PORT') || 3001;
      const fallbackUrl = `http://localhost:${port}/uploads/${key}`;

      const asset = await this.prisma.uploadedAsset.create({
        data: {
          userId,
          key,
          url: fallbackUrl,
          filename: dto.filename,
          mimeType: dto.mimeType || 'application/octet-stream',
          size: dto.fileSize || null,
          folder: cleanFolder,
          status: 'pending',
        },
      });

      return {
        uploadUrl: `/api/storage/upload?folder=${cleanFolder}`,
        publicUrl: fallbackUrl,
        key,
        assetId: asset.id,
        isDirectR2: false,
      };
    }
  }

  /**
   * Confirms a direct upload completed by the client and updates database status to "uploaded".
   */
  async confirmUpload(userId: string, dto: ConfirmUploadDto) {
    const asset = await this.prisma.uploadedAsset.findFirst({
      where: {
        key: dto.key,
        userId,
      },
    });

    if (!asset) {
      throw new NotFoundException(`Tracked asset with key "${dto.key}" not found for this user.`);
    }

    const updated = await this.prisma.uploadedAsset.update({
      where: { id: asset.id },
      data: {
        status: 'uploaded',
        ...(dto.size ? { size: dto.size } : {}),
      },
    });

    this.logger.log(`Confirmed upload for key: ${dto.key} (assetId: ${updated.id})`);
    return {
      success: true,
      asset: updated,
    };
  }

  /**
   * Get all tracked assets for a user (optionally filtered by folder).
   */
  async getUserAssets(userId: string, folder?: string) {
    return this.prisma.uploadedAsset.findMany({
      where: {
        userId,
        ...(folder ? { folder } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Server-side upload fallback (e.g. for multipart legacy/dev usage).
   */
  async uploadFile(file: Express.Multer.File, folder: string = 'media', userId?: string): Promise<UploadResult> {
    if (!file || !file.buffer) {
      throw new BadRequestException('No file buffer provided for upload.');
    }

    const cleanFolder = folder.replace(/[^a-zA-Z0-9_-]/g, '') || 'media';
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    const sanitizedName = (file.originalname || 'file')
      .toLowerCase()
      .replace(/[^a-z0-9.-]/g, '_');
    const userPrefix = userId ? `${userId}/` : '';
    const key = `${cleanFolder}/${userPrefix}${timestamp}-${randomSuffix}-${sanitizedName}`;

    let publicUrl = '';

    if (this.isConfigured && this.s3Client) {
      try {
        await this.s3Client.send(
          new PutObjectCommand({
            Bucket: this.bucketName,
            Key: key,
            Body: file.buffer,
            ContentType: file.mimetype || 'application/octet-stream',
            CacheControl: 'max-age=31536000, public, immutable',
          }),
        );

        publicUrl = this.getResolvedPublicUrl(key);

        this.logger.log(`Uploaded to Cloudflare R2: ${key} (${file.size} bytes)`);
      } catch (err: any) {
        this.logger.error(`Failed to upload to Cloudflare R2: ${err.message}`, err.stack);
        throw new BadRequestException(`Cloudflare R2 upload error: ${err.message}`);
      }
    } else {
      // Local fallback mode
      const uploadsDir = path.join(process.cwd(), 'uploads', cleanFolder);
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }
      const localFilePath = path.join(uploadsDir, `${timestamp}-${randomSuffix}-${sanitizedName}`);
      fs.writeFileSync(localFilePath, file.buffer);

      const port = this.config.get<number>('PORT') || 3001;
      publicUrl = `http://localhost:${port}/uploads/${key}`;

      this.logger.log(`Saved locally: ${localFilePath}`);
    }

    // Track in database if userId available
    let assetId: string | undefined;
    if (userId) {
      const asset = await this.prisma.uploadedAsset.create({
        data: {
          userId,
          key,
          url: publicUrl,
          filename: file.originalname || 'file',
          mimeType: file.mimetype || 'application/octet-stream',
          size: file.size,
          folder: cleanFolder,
          status: 'uploaded',
        },
      });
      assetId = asset.id;
    }

    return {
      url: publicUrl,
      key,
      size: file.size,
      mimeType: file.mimetype,
      originalName: file.originalname,
      assetId,
    };
  }

  /**
   * Upload multiple files concurrently (fallback).
   */
  async uploadMultiple(files: Express.Multer.File[], folder: string = 'media', userId?: string): Promise<UploadResult[]> {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files provided.');
    }
    return Promise.all(files.map((file) => this.uploadFile(file, folder, userId)));
  }

  /**
   * Delete a file from Cloudflare R2 and remove from database.
   */
  async deleteFile(key: string, userId?: string, isAdmin: boolean = false): Promise<{ success: boolean; message: string }> {
    if (!key) throw new BadRequestException('Storage key is required.');

    // Check ownership if userId provided and not admin
    if (userId && !isAdmin) {
      const asset = await this.prisma.uploadedAsset.findUnique({
        where: { key },
      });
      if (asset && asset.userId !== userId) {
        throw new ForbiddenException('You do not have permission to delete this asset.');
      }
    }

    if (this.isConfigured && this.s3Client) {
      try {
        await this.s3Client.send(
          new DeleteObjectCommand({
            Bucket: this.bucketName,
            Key: key,
          }),
        );
        this.logger.log(`Deleted from Cloudflare R2: ${key}`);
      } catch (err: any) {
        this.logger.error(`Failed to delete from Cloudflare R2: ${err.message}`);
        throw new BadRequestException(`Failed to delete object from R2: ${err.message}`);
      }
    } else {
      const localPath = path.join(process.cwd(), 'uploads', key);
      if (fs.existsSync(localPath)) {
        fs.unlinkSync(localPath);
      }
    }

    // Remove DB tracking record
    await this.prisma.uploadedAsset.deleteMany({
      where: { key },
    });

    return { success: true, message: `File ${key} removed from storage and registry.` };
  }

  /**
   * Retrieves an object read stream from Cloudflare R2 (or local filesystem).
   */
  async getObjectStream(key: string): Promise<{
    stream: any;
    contentType: string;
    contentLength?: number;
  }> {
    if (this.isConfigured && this.s3Client) {
      try {
        const res = await this.s3Client.send(
          new GetObjectCommand({
            Bucket: this.bucketName,
            Key: key,
          }),
        );
        return {
          stream: res.Body,
          contentType: res.ContentType || 'application/octet-stream',
          contentLength: res.ContentLength,
        };
      } catch (err: any) {
        this.logger.error(`Error retrieving object ${key} from R2: ${err.message}`);
        throw new NotFoundException(`File ${key} not found in cloud storage.`);
      }
    } else {
      const localPath = path.join(process.cwd(), 'uploads', key);
      if (fs.existsSync(localPath)) {
        return {
          stream: fs.createReadStream(localPath),
          contentType: 'application/octet-stream',
          contentLength: fs.statSync(localPath).size,
        };
      }
      throw new NotFoundException(`File ${key} not found in local storage.`);
    }
  }
}
