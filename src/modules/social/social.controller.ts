import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { SocialService } from './social.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CreateShortlistDto, AddShortlistArtistDto } from './dto/social.dto';

@Controller()
@UseGuards(JwtAuthGuard)
export class SocialController {
  constructor(private readonly socialService: SocialService) {}

  // ─── Shortlists (Art Professionals) ─────────────────────────────────

  @Get('shortlists')
  @UseGuards(RolesGuard)
  @Roles('art_professional')
  getShortlists(@CurrentUser() user: any) {
    return this.socialService.getShortlists(user.id);
  }

  @Post('shortlists')
  @UseGuards(RolesGuard)
  @Roles('art_professional')
  createShortlist(@CurrentUser() user: any, @Body() dto: CreateShortlistDto) {
    return this.socialService.createShortlist(user.id, dto);
  }

  @Get('shortlists/:id')
  @UseGuards(RolesGuard)
  @Roles('art_professional')
  getShortlist(@CurrentUser() user: any, @Param('id') id: string) {
    return this.socialService.getShortlist(user.id, id);
  }

  @Delete('shortlists/:id')
  @UseGuards(RolesGuard)
  @Roles('art_professional')
  deleteShortlist(@CurrentUser() user: any, @Param('id') id: string) {
    return this.socialService.deleteShortlist(user.id, id);
  }

  @Post('shortlists/:id/artists')
  @UseGuards(RolesGuard)
  @Roles('art_professional')
  addArtistToShortlist(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: AddShortlistArtistDto,
  ) {
    return this.socialService.addArtistToShortlist(user.id, id, dto);
  }

  @Delete('shortlists/:id/artists/:artistId')
  @UseGuards(RolesGuard)
  @Roles('art_professional')
  removeArtistFromShortlist(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Param('artistId') artistId: string,
  ) {
    return this.socialService.removeArtistFromShortlist(user.id, id, artistId);
  }

  // ─── Follows ────────────────────────────────────────────────────────

  @Post('follows/:artistId')
  followArtist(@CurrentUser() user: any, @Param('artistId') artistId: string) {
    return this.socialService.followArtist(user.id, artistId);
  }

  @Delete('follows/:artistId')
  unfollowArtist(@CurrentUser() user: any, @Param('artistId') artistId: string) {
    return this.socialService.unfollowArtist(user.id, artistId);
  }

  @Get('follows')
  getFollowedArtists(@CurrentUser() user: any) {
    return this.socialService.getFollowedArtists(user.id);
  }

  @Get('follows/check/:artistId')
  checkFollow(@CurrentUser() user: any, @Param('artistId') artistId: string) {
    return this.socialService.checkFollow(user.id, artistId);
  }
}

