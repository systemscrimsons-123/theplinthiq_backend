import {
  Controller, Get, Post, Put, Patch, Delete,
  Body, Param, Query, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ArtistsService } from './artists.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import {
  UpsertArtistProfileDto,
  AddAestheticDto,
  AddPortfolioItemDto,
  UpdatePortfolioItemDto,
  AddCvEntryDto,
  QueryArtistsDto,
} from './dto/artist.dto';

@Controller('artists')
export class ArtistsController {
  constructor(private readonly artistsService: ArtistsService) {}

  // ─── Discovery ───────────────────────────────────────────────────────
  /** GET /api/artists — list all artists with filters */
  @Get()
  listArtists(@Query() query: QueryArtistsDto) {
    return this.artistsService.listArtists(query);
  }

  /** GET /api/artists/me — my full profile (owner) */
  @Get('me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('artist')
  getMyProfile(@CurrentUser() user: any) {
    return this.artistsService.getMyProfile(user.id);
  }

  /** PUT /api/artists/me — upsert my profile */
  @Put('me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('artist')
  upsertMyProfile(@CurrentUser() user: any, @Body() dto: UpsertArtistProfileDto) {
    return this.artistsService.upsertMyProfile(user.id, dto);
  }

  /** GET /api/artists/:id — public profile */
  @Get(':id')
  getPublicProfile(@Param('id') id: string) {
    return this.artistsService.getPublicProfile(id);
  }

  // ─── Aesthetics ──────────────────────────────────────────────────────
  /** POST /api/artists/me/aesthetics */
  @Post('me/aesthetics')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('artist')
  addAesthetic(@CurrentUser() user: any, @Body() dto: AddAestheticDto) {
    return this.artistsService.addAesthetic(user.id, dto);
  }

  /** DELETE /api/artists/me/aesthetics/:id */
  @Delete('me/aesthetics/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('artist')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeAesthetic(@CurrentUser() user: any, @Param('id') id: string) {
    return this.artistsService.removeAesthetic(user.id, id);
  }

  // ─── Portfolio ───────────────────────────────────────────────────────
  /** POST /api/artists/me/portfolio */
  @Post('me/portfolio')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('artist')
  addPortfolioItem(@CurrentUser() user: any, @Body() dto: AddPortfolioItemDto) {
    return this.artistsService.addPortfolioItem(user.id, dto);
  }

  /** PATCH /api/artists/me/portfolio/:id */
  @Patch('me/portfolio/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('artist')
  updatePortfolioItem(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: UpdatePortfolioItemDto,
  ) {
    return this.artistsService.updatePortfolioItem(user.id, id, dto);
  }

  /** DELETE /api/artists/me/portfolio/:id */
  @Delete('me/portfolio/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('artist')
  @HttpCode(HttpStatus.NO_CONTENT)
  deletePortfolioItem(@CurrentUser() user: any, @Param('id') id: string) {
    return this.artistsService.deletePortfolioItem(user.id, id);
  }

  /** PATCH /api/artists/me/portfolio/reorder */
  @Patch('me/portfolio/reorder')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('artist')
  reorderPortfolio(@CurrentUser() user: any, @Body('orderedIds') orderedIds: string[]) {
    return this.artistsService.reorderPortfolioItems(user.id, orderedIds);
  }

  // ─── CV ─────────────────────────────────────────────────────────────
  /** POST /api/artists/me/cv */
  @Post('me/cv')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('artist')
  addCvEntry(@CurrentUser() user: any, @Body() dto: AddCvEntryDto) {
    return this.artistsService.addCvEntry(user.id, dto);
  }

  /** PUT /api/artists/me/cv/:id */
  @Put('me/cv/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('artist')
  updateCvEntry(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: AddCvEntryDto) {
    return this.artistsService.updateCvEntry(user.id, id, dto);
  }

  /** DELETE /api/artists/me/cv/:id */
  @Delete('me/cv/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('artist')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteCvEntry(@CurrentUser() user: any, @Param('id') id: string) {
    return this.artistsService.deleteCvEntry(user.id, id);
  }

  // ─── Private Viewing Room (PVR) ──────────────────────────────────────
  /** GET /api/artists/:id/pvr — private unreleased works (requires PvrAccessGrant) */
  @Get(':id/pvr')
  @UseGuards(JwtAuthGuard)
  getPvrWorks(@CurrentUser() user: any, @Param('id') id: string) {
    return this.artistsService.getPvrWorks(id, user.id);
  }
}

