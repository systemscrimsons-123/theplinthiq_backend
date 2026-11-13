import {
  Body,
  Controller,
  Get,
  Post,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { OnboardingService } from './onboarding.service';
import {
  ArtistOnboardingDto,
  GalleryOnboardingDto,
  ArtProfessionalOnboardingDto,
  CollectorOnboardingDto,
} from './dto/onboarding.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('onboarding')
@UseGuards(JwtAuthGuard)
export class OnboardingController {
  constructor(private readonly onboardingService: OnboardingService) {}

  /**
   * POST /api/onboarding/artist
   * Saves artist profile, links mediums/aesthetics/scale/intent, and marks onboarding complete.
   */
  @Post('artist')
  @HttpCode(HttpStatus.OK)
  saveArtist(
    @CurrentUser() user: any,
    @Body() dto: ArtistOnboardingDto,
  ) {
    return this.onboardingService.saveArtistOnboarding(user.id, dto);
  }

  /**
   * POST /api/onboarding/gallery
   * Saves gallery profile, location, mediums, target stages, and marks onboarding complete.
   */
  @Post('gallery')
  @HttpCode(HttpStatus.OK)
  saveGallery(
    @CurrentUser() user: any,
    @Body() dto: GalleryOnboardingDto,
  ) {
    return this.onboardingService.saveGalleryOnboarding(user.id, dto);
  }

  /**
   * POST /api/onboarding/art-professional
   * Saves art professional profile, preferences, interests, contact info, and marks onboarding complete.
   */
  @Post('art-professional')
  @HttpCode(HttpStatus.OK)
  saveProfessional(
    @CurrentUser() user: any,
    @Body() dto: ArtProfessionalOnboardingDto,
  ) {
    return this.onboardingService.saveProfessionalOnboarding(user.id, dto);
  }

  /**
   * POST /api/onboarding/collector
   * Saves collector profile, interests, career prefs, intents, and activates collector account.
   */
  @Post('collector')
  @HttpCode(HttpStatus.OK)
  saveCollector(
    @CurrentUser() user: any,
    @Body() dto: CollectorOnboardingDto,
  ) {
    return this.onboardingService.saveCollectorOnboarding(user.id, dto);
  }

  /**
   * POST /api/onboarding/complete
   * Generic fallback endpoint to mark onboarding completed for the current authenticated user.
   */
  @Post('complete')
  @HttpCode(HttpStatus.OK)
  complete(@CurrentUser() user: any) {
    return this.onboardingService.completeOnboarding(user.id);
  }

  /**
   * GET /api/onboarding/status
   * Returns onboarding and profile state for the current authenticated user.
   */
  @Get('status')
  getStatus(@CurrentUser() user: any) {
    return this.onboardingService.getStatus(user.id);
  }
}

