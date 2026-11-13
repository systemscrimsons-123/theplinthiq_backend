import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { RequestsService } from './requests.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import {
  CreateRequestDto,
  RespondRequestDto,
  ScheduleVisitDto,
  UpdatePvrArtworksDto,
  SharePvrDocumentDto,
  UpdatePvrNotesDto,
  UpdatePvrStatusDto,
  WithdrawRequestDto,
} from './dto/request.dto';

@Controller('requests')
@UseGuards(JwtAuthGuard)
export class RequestsController {
  constructor(private readonly requestsService: RequestsService) {}

  /**
   * POST /api/requests — initiate a request (PVR, Introduction, Visit, Enquiry)
   * Enforces the interaction permission matrix.
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  createRequest(@CurrentUser() user: any, @Body() dto: CreateRequestDto) {
    return this.requestsService.createRequest(user.id, dto);
  }

  /**
   * GET /api/requests/sent — list all requests sent by logged-in user
   */
  @Get('sent')
  getSentRequests(@CurrentUser() user: any) {
    return this.requestsService.getSentRequests(user.id);
  }

  /**
   * GET /api/requests/received — list all requests received by logged-in user
   */
  @Get('received')
  getReceivedRequests(@CurrentUser() user: any) {
    return this.requestsService.getReceivedRequests(user.id);
  }

  /**
   * GET /api/requests/activity — unified chronological activity feed for user
   */
  @Get('activity')
  getActivity(@CurrentUser() user: any) {
    return this.requestsService.getActivity(user.id);
  }

  /**
   * GET /api/requests/pvr/session/:sessionId — dynamic PVR room session resolution
   */
  @Get('pvr/session/:sessionId')
  getPvrSession(
    @CurrentUser() user: any,
    @Param('sessionId') sessionId: string,
  ) {
    return this.requestsService.getPvrSession(user.id, sessionId);
  }

  /**
   * GET /api/requests/:id — view request details
   */
  @Get(':id')
  getRequest(@CurrentUser() user: any, @Param('id') id: string) {
    return this.requestsService.getRequest(user.id, id);
  }

  /**
   * PATCH /api/requests/:id/respond — accept or decline request
   * Decline feedback is strictly mandatory when declining.
   */
  @Patch(':id/respond')
  respondToRequest(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: RespondRequestDto,
  ) {
    return this.requestsService.respondToRequest(user.id, id, dto);
  }

  @Patch(':id/withdraw')
  withdrawRequest(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: WithdrawRequestDto,
  ) {
    return this.requestsService.withdrawRequest(user.id, id, dto);
  }

  /**
   * PATCH /api/requests/:id/complete — mark visit as completed
   */
  @Patch(':id/complete')
  completeRequest(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() body?: { notes?: string },
  ) {
    return this.requestsService.completeVisit(user.id, id, body?.notes);
  }

  /**
   * PATCH /api/requests/:id/visit/schedule — schedule or confirm visit
   */
  @Patch(':id/visit/schedule')
  scheduleVisit(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: ScheduleVisitDto,
  ) {
    return this.requestsService.scheduleVisit(user.id, id, dto);
  }

  /**
   * POST /api/requests/:id/pvr/artworks — update artworks granted to this PVR session
   */
  @Post(':id/pvr/artworks')
  updatePvrArtworks(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: UpdatePvrArtworksDto,
  ) {
    return this.requestsService.updatePvrArtworks(user.id, id, dto.portfolioItemIds);
  }

  /**
   * POST /api/requests/:id/pvr/documents — share a document or condition report
   */
  @Post(':id/pvr/documents')
  sharePvrDocument(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: SharePvrDocumentDto,
  ) {
    return this.requestsService.sharePvrDocument(user.id, id, dto);
  }

  /**
   * PATCH /api/requests/:id/pvr/notes — save private artist session notes
   */
  @Patch(':id/pvr/notes')
  updatePvrNotes(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: UpdatePvrNotesDto,
  ) {
    return this.requestsService.updatePvrNotes(user.id, id, dto.notes);
  }

  /**
   * PATCH /api/requests/:id/pvr/status — toggle session active state (End/Resume)
   */
  @Patch(':id/pvr/status')
  togglePvrStatus(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: UpdatePvrStatusDto,
  ) {
    return this.requestsService.togglePvrSessionStatus(user.id, id, dto.isActive);
  }
}

