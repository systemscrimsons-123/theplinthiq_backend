import {
  Controller,
  Get,
  Put,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { GalleriesService } from './galleries.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import {
  UpdateGalleryProfileDto,
  AddRosterArtistDto,
  UpdateRosterStatusDto,
  CreateExhibitionDto,
  UpdateExhibitionDto,
  QueryGalleriesDto,
} from './dto/gallery.dto';

@Controller('galleries')
export class GalleriesController {
  constructor(private readonly galleriesService: GalleriesService) {}

  /**
   * GET /api/galleries — discovery search & filtering
   */
  @Get()
  listGalleries(@Query() query: QueryGalleriesDto) {
    return this.galleriesService.listGalleries(query);
  }

  /**
   * GET /api/galleries/me — current logged-in gallery profile
   */
  @Get('me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('gallery')
  getMyGallery(@CurrentUser() user: any) {
    return this.galleriesService.getMyGallery(user.id);
  }

  /**
   * PUT /api/galleries/me — update current gallery profile
   */
  @Put('me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('gallery')
  updateMyGallery(@CurrentUser() user: any, @Body() dto: UpdateGalleryProfileDto) {
    return this.galleriesService.updateMyGallery(user.id, dto);
  }

  /**
   * GET /api/galleries/me/roster — list artists on roster
   */
  @Get('me/roster')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('gallery')
  getRoster(@CurrentUser() user: any) {
    return this.galleriesService.getRoster(user.id);
  }

  /**
   * POST /api/galleries/me/roster — add artist to roster
   */
  @Post('me/roster')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('gallery')
  addRosterArtist(@CurrentUser() user: any, @Body() dto: AddRosterArtistDto) {
    return this.galleriesService.addRosterArtist(user.id, dto);
  }

  /**
   * DELETE /api/galleries/me/roster/:artistId — remove artist from roster
   */
  @Delete('me/roster/:artistId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('gallery')
  removeRosterArtist(@CurrentUser() user: any, @Param('artistId') artistId: string) {
    return this.galleriesService.removeRosterArtist(user.id, artistId);
  }

  /**
   * PATCH /api/galleries/me/roster/:artistId/status — update artist roster status (active, pending, inactive)
   */
  @Patch('me/roster/:artistId/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('gallery')
  updateRosterStatus(
    @CurrentUser() user: any,
    @Param('artistId') artistId: string,
    @Body() dto: UpdateRosterStatusDto,
  ) {
    return this.galleriesService.updateRosterStatus(user.id, artistId, dto.status);
  }

  /**
   * GET /api/galleries/me/exhibitions — list gallery exhibitions
   */
  @Get('me/exhibitions')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('gallery')
  getExhibitions(@CurrentUser() user: any) {
    return this.galleriesService.getExhibitions(user.id);
  }

  /**
   * POST /api/galleries/me/exhibitions — create new exhibition
   */
  @Post('me/exhibitions')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('gallery')
  addExhibition(@CurrentUser() user: any, @Body() dto: CreateExhibitionDto) {
    return this.galleriesService.addExhibition(user.id, dto);
  }

  /**
   * PUT /api/galleries/me/exhibitions/:id — update exhibition
   */
  @Put('me/exhibitions/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('gallery')
  updateExhibition(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: UpdateExhibitionDto,
  ) {
    return this.galleriesService.updateExhibition(user.id, id, dto);
  }

  /**
   * DELETE /api/galleries/me/exhibitions/:id — delete exhibition
   */
  @Delete('me/exhibitions/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('gallery')
  deleteExhibition(@CurrentUser() user: any, @Param('id') id: string) {
    return this.galleriesService.deleteExhibition(user.id, id);
  }

  /**
   * GET /api/galleries/:id — public gallery profile
   */
  @Get(':id')
  getPublicGallery(@Param('id') id: string) {
    return this.galleriesService.getPublicGallery(id);
  }
}

