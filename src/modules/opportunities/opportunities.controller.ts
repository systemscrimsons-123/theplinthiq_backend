import {
  Controller, Get, Post, Put, Patch, Delete, Body, Param, Query,
  UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { OpportunitiesService } from './opportunities.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CreateBriefDto, UpdateBriefDto, SubmitPitchDto } from './dto/opportunity.dto';
import { BriefType, BriefStatus, PitchStatus } from '@prisma/client';

@Controller('opportunities')
export class OpportunitiesController {
  constructor(private readonly opportunitiesService: OpportunitiesService) {}

  /** GET /api/opportunities */
  @Get()
  listBriefs(
    @Query('briefType') briefType?: BriefType,
    @Query('search') search?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.opportunitiesService.listBriefs({ briefType, search, page, limit });
  }

  /** GET /api/opportunities/mine — briefs I posted */
  @Get('mine')
  @UseGuards(JwtAuthGuard)
  myBriefs(@CurrentUser() user: any) {
    return this.opportunitiesService.myBriefs(user.id);
  }

  /** GET /api/opportunities/my-pitches — pitches I submitted */
  @Get('my-pitches')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('artist')
  myPitches(@CurrentUser() user: any) {
    return this.opportunitiesService.myPitches(user.id);
  }

  /** GET /api/opportunities/pitches/received — all pitches received across all my briefs */
  @Get('pitches/received')
  @UseGuards(JwtAuthGuard)
  myReceivedPitches(
    @CurrentUser() user: any,
    @Query('status') status?: PitchStatus,
    @Query('briefId') briefId?: string,
    @Query('search') search?: string,
  ) {
    return this.opportunitiesService.myReceivedPitches(user.id, { status, briefId, search });
  }

  /** GET /api/opportunities/pitches/:pitchId — get single pitch details */
  @Get('pitches/:pitchId')
  @UseGuards(JwtAuthGuard)
  getPitch(@CurrentUser() user: any, @Param('pitchId') pitchId: string) {
    return this.opportunitiesService.getPitch(user.id, pitchId);
  }

  /** GET /api/opportunities/:id */
  @Get(':id')
  getBrief(@Param('id') id: string) {
    return this.opportunitiesService.getBrief(id);
  }

  /** POST /api/opportunities — create a brief */
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('gallery', 'art_professional', 'collector')
  createBrief(@CurrentUser() user: any, @Body() dto: CreateBriefDto) {
    return this.opportunitiesService.createBrief(user.id, dto);
  }

  /** PUT /api/opportunities/:id — update a brief */
  @Put(':id')
  @UseGuards(JwtAuthGuard)
  updateBrief(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: UpdateBriefDto,
  ) {
    return this.opportunitiesService.updateBrief(user.id, id, dto);
  }

  /** DELETE /api/opportunities/:id — delete a brief */
  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  deleteBrief(
    @CurrentUser() user: any,
    @Param('id') id: string,
  ) {
    return this.opportunitiesService.deleteBrief(user.id, id);
  }

  /** GET /api/opportunities/:id/pitches — pitches received (for poster) */
  @Get(':id/pitches')
  @UseGuards(JwtAuthGuard)
  pitchesForBrief(@CurrentUser() user: any, @Param('id') id: string) {
    return this.opportunitiesService.pitchesForBrief(user.id, id);
  }

  /** POST /api/opportunities/:id/pitch — artist submits a pitch */
  @Post(':id/pitch')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('artist')
  submitPitch(
    @CurrentUser() user: any,
    @Param('id') briefId: string,
    @Body() dto: SubmitPitchDto,
  ) {
    return this.opportunitiesService.submitPitch(user.id, briefId, dto);
  }

  /** PATCH /api/opportunities/pitches/:pitchId/status — review a pitch */
  @Patch('pitches/:pitchId/status')
  @UseGuards(JwtAuthGuard)
  updatePitchStatus(
    @CurrentUser() user: any,
    @Param('pitchId') pitchId: string,
    @Body('status') status: PitchStatus,
    @Body('declineFeedback') declineFeedback?: string,
  ) {
    return this.opportunitiesService.updatePitchStatus(user.id, pitchId, status, declineFeedback);
  }

  /** POST /api/opportunities/pitches/:pitchId/withdraw — artist withdraws pitch */
  @Post('pitches/:pitchId/withdraw')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('artist')
  withdrawPitch(
    @CurrentUser() user: any,
    @Param('pitchId') pitchId: string,
  ) {
    return this.opportunitiesService.withdrawPitch(user.id, pitchId);
  }

  /** PATCH /api/opportunities/pitches/:pitchId/notes — update internal curator notes */
  @Patch('pitches/:pitchId/notes')
  @UseGuards(JwtAuthGuard)
  updateCuratorNotes(
    @CurrentUser() user: any,
    @Param('pitchId') pitchId: string,
    @Body('notes') notes: string,
  ) {
    return this.opportunitiesService.updateCuratorNotes(user.id, pitchId, notes);
  }
}


