import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { VerificationService } from './verification.service';
import { SubmitVerificationDto, ReviewVerificationDto, SubmitSupportInquiryDto } from './dto/verification.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('verification')
export class VerificationController {
  constructor(private readonly verificationService: VerificationService) {}

  /**
   * POST /api/verification/submit
   * User submits evidence (ID card, bio notes, portfolio links) for identity verification.
   */
  @Post('submit')
  @UseGuards(JwtAuthGuard)
  submit(
    @CurrentUser() user: any,
    @Body() dto: SubmitVerificationDto,
  ) {
    return this.verificationService.submitVerification(user.id, dto);
  }

  /**
   * POST /api/verification/support
   * User submits an inquiry to the curation team regarding document upload or verification issues.
   */
  @Post('support')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  sendSupport(
    @CurrentUser() user: any,
    @Body() dto: SubmitSupportInquiryDto,
  ) {
    return this.verificationService.sendSupportInquiry(user.id, dto.message);
  }

  /**
   * GET /api/verification/status
   * Checks current verification status for logged-in user.
   */
  @Get('status')
  @UseGuards(JwtAuthGuard)
  getStatus(@CurrentUser() user: any) {
    return this.verificationService.getStatus(user.id);
  }

  /**
   * GET /api/verification/queue?status=pending|verified|rejected|all
   * Admin queue of verification submissions.
   */
  @Get('queue')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  listQueue(@Query('status') status?: string) {
    return this.verificationService.listQueue(status);
  }

  /**
   * GET /api/verification/:submissionId
   * Admin: view detailed submission dossier.
   */
  @Get(':submissionId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  getSubmission(@Param('submissionId') submissionId: string) {
    return this.verificationService.getSubmission(submissionId);
  }

  /**
   * PATCH /api/verification/:submissionId/decision
   * Admin reviews submission: decision ('verified' | 'rejected').
   * Approving sets user status to 'active' and verificationStatus to 'verified'.
   */
  @Patch(':submissionId/decision')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  reviewSubmission(
    @Param('submissionId') submissionId: string,
    @Body() dto: ReviewVerificationDto,
    @CurrentUser() user: any,
  ) {
    return this.verificationService.reviewSubmission(user?.id, submissionId, dto);
  }
}
