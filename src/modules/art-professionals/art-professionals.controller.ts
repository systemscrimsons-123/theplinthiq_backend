import {
  Controller,
  Get,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ArtProfessionalsService } from './art-professionals.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import {
  UpdateArtProfessionalProfileDto,
  UpdateArtProfessionalPreferencesDto,
  QueryArtProfessionalsDto,
} from './dto/art-professional.dto';

@Controller('art-professionals')
export class ArtProfessionalsController {
  constructor(private readonly artProfessionalsService: ArtProfessionalsService) {}

  /**
   * GET /api/art-professionals — discovery search & filtering
   */
  @Get()
  listArtProfessionals(@Query() query: QueryArtProfessionalsDto) {
    return this.artProfessionalsService.listArtProfessionals(query);
  }

  /**
   * GET /api/art-professionals/me — current logged-in professional's full profile
   */
  @Get('me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('art_professional')
  getMyProfile(@CurrentUser() user: any) {
    return this.artProfessionalsService.getMyProfile(user.id);
  }

  /**
   * PUT /api/art-professionals/me — update current professional's profile
   */
  @Put('me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('art_professional')
  updateMyProfile(
    @CurrentUser() user: any,
    @Body() dto: UpdateArtProfessionalProfileDto,
  ) {
    return this.artProfessionalsService.updateMyProfile(user.id, dto);
  }

  /**
   * GET /api/art-professionals/me/preferences — get opportunity preferences
   */
  @Get('me/preferences')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('art_professional')
  getPreferences(@CurrentUser() user: any) {
    return this.artProfessionalsService.getPreferences(user.id);
  }

  /**
   * PUT /api/art-professionals/me/preferences — store/update opportunity preferences
   */
  @Put('me/preferences')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('art_professional')
  updatePreferences(
    @CurrentUser() user: any,
    @Body() dto: UpdateArtProfessionalPreferencesDto,
  ) {
    return this.artProfessionalsService.updatePreferences(user.id, dto);
  }

  /**
   * GET /api/art-professionals/:id — public profile
   */
  @Get(':id')
  getPublicProfile(@Param('id') id: string) {
    return this.artProfessionalsService.getPublicProfile(id);
  }
}

