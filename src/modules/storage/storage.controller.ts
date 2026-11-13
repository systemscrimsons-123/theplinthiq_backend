import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Query,
  Body,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  UseGuards,
  BadRequestException,
  HttpCode,
  HttpStatus,
  Res,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { StorageService } from './storage.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { GetPresignedUrlDto, ConfirmUploadDto } from './dto/storage.dto';

@Controller('storage')
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  /**
   * POST /api/storage/presigned-url
   * Request a pre-signed PUT URL to upload directly from browser to Cloudflare R2.
   * Tracks upload in database with status 'pending'.
   */
  @Post('presigned-url')
  @UseGuards(JwtAuthGuard)
  async getPresignedUrl(
    @CurrentUser() user: any,
    @Body() dto: GetPresignedUrlDto,
  ) {
    return this.storageService.getPresignedPutUrl(user.id, dto);
  }

  /**
   * POST /api/storage/confirm-upload
   * Client confirms direct upload completion to update database status to 'uploaded'.
   */
  @Post('confirm-upload')
  @UseGuards(JwtAuthGuard)
  async confirmUpload(
    @CurrentUser() user: any,
    @Body() dto: ConfirmUploadDto,
  ) {
    return this.storageService.confirmUpload(user.id, dto);
  }

  /**
   * GET /api/storage/assets?folder=artworks
   * List all tracked assets belonging to the authenticated user.
   */
  @Get('assets')
  @UseGuards(JwtAuthGuard)
  async getUserAssets(
    @CurrentUser() user: any,
    @Query('folder') folder?: string,
  ) {
    return this.storageService.getUserAssets(user.id, folder);
  }

  /**
   * POST /api/storage/upload?folder=artworks
   * Server fallback single file upload endpoint.
   */
  @Post('upload')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: 50 * 1024 * 1024, // 50MB max
      },
    }),
  )
  async uploadSingle(
    @CurrentUser() user: any,
    @UploadedFile() file: Express.Multer.File,
    @Query('folder') folder: string = 'media',
  ) {
    if (!file) {
      throw new BadRequestException('No file provided under form-data key "file".');
    }
    return this.storageService.uploadFile(file, folder, user.id);
  }

  /**
   * POST /api/storage/upload-multiple?folder=artworks
   * Server fallback batch upload.
   */
  @Post('upload-multiple')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FilesInterceptor('files', 10, {
      limits: {
        fileSize: 50 * 1024 * 1024,
      },
    }),
  )
  async uploadMultiple(
    @CurrentUser() user: any,
    @UploadedFiles() files: Express.Multer.File[],
    @Query('folder') folder: string = 'media',
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files provided under form-data key "files".');
    }
    return this.storageService.uploadMultiple(files, folder, user.id);
  }

  /**
   * GET /api/storage/file/:key(*)
   * Public streaming endpoint for stored files (bypasses CORS/public CDN constraints).
   */
  @Get('file/:key(*)')
  async serveFile(
    @Param('key') key: string,
    @Res() res: any,
  ) {
    const { stream, contentType, contentLength } = await this.storageService.getObjectStream(key);
    res.setHeader('Content-Type', contentType);
    if (contentLength) res.setHeader('Content-Length', contentLength);
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    if (stream && typeof stream.pipe === 'function') {
      stream.pipe(res);
    } else if (stream) {
      const buffer = Buffer.from(await stream.transformToByteArray());
      res.end(buffer);
    }
  }

  /**
   * DELETE /api/storage/:key
   * Delete an object from Cloudflare R2 and database registry.
   */
  @Delete(':key(*)')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async deleteFile(
    @CurrentUser() user: any,
    @Param('key') key: string,
  ) {
    const isAdmin = user.role === 'admin';
    return this.storageService.deleteFile(key, user.id, isAdmin);
  }
}
