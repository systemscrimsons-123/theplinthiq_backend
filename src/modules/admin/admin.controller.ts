import {
  Controller,
  Get,
  Patch,
  Put,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import {
  UpdateUserStatusDto,
  QueryUsersDto,
  UpdatePermissionDto,
  UpdateBriefStatusDto,
  QueryAdminBriefsDto,
  QueryAdminPitchesDto,
  QueryAdminRequestsDto,
  QueryActivityDto,
} from './dto/admin.dto';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  /**
   * GET /api/admin/kpis — platform engagement KPIs
   */
  @Get('kpis')
  getKpis() {
    return this.adminService.getKpis();
  }

  /**
   * GET /api/admin/requests-kpis — 30-day reporting detail
   */
  @Get('requests-kpis')
  getRequestsKpis() {
    return this.adminService.getRequestsKpis();
  }

  /**
   * GET /api/admin/users — manage and search users
   */
  @Get('users')
  listUsers(@Query() query: QueryUsersDto) {
    return this.adminService.listUsers(query);
  }

  /**
   * GET /api/admin/users/:id — view detailed user profile
   */
  @Get('users/:id')
  getUserDetail(@Param('id') id: string) {
    return this.adminService.getUserDetail(id);
  }

  /**
   * PATCH /api/admin/users/:id/status — activate / deactivate user account
   */
  @Patch('users/:id/status')
  updateUserStatus(
    @CurrentUser() admin: any,
    @Param('id') targetUserId: string,
    @Body() dto: UpdateUserStatusDto,
  ) {
    return this.adminService.updateUserStatus(admin.id, targetUserId, dto);
  }

  /**
   * GET /api/admin/briefs — view all published/draft/closed briefs
   */
  @Get('briefs')
  getBriefs(@Query() query: QueryAdminBriefsDto) {
    return this.adminService.getBriefs(query);
  }

  /**
   * PATCH /api/admin/briefs/:id/status — unpublish / close / reopen brief
   */
  @Patch('briefs/:id/status')
  updateBriefStatus(
    @CurrentUser() admin: any,
    @Param('id') briefId: string,
    @Body() dto: UpdateBriefStatusDto,
  ) {
    return this.adminService.updateBriefStatus(admin.id, briefId, dto.status);
  }

  /**
   * GET /api/admin/pitches — view pitches across all briefs
   */
  @Get('pitches')
  getPitches(@Query() query: QueryAdminPitchesDto) {
    return this.adminService.getPitches(query);
  }

  /**
   * GET /api/admin/requests — view all PVR, intro, visit, enquiry requests
   */
  @Get('requests')
  getRequests(@Query() query: QueryAdminRequestsDto) {
    return this.adminService.getRequests(query);
  }

  /**
   * GET /api/admin/permissions — get interaction permissions matrix
   */
  @Get('permissions')
  getPermissions() {
    return this.adminService.getPermissions();
  }

  /**
   * PUT /api/admin/permissions — update a pair's interaction mode
   */
  @Put('permissions')
  updatePermission(@CurrentUser() admin: any, @Body() dto: UpdatePermissionDto) {
    return this.adminService.updatePermission(admin.id, dto);
  }

  /**
   * GET /api/admin/activity — admin activity audit logs
   */
  @Get('activity')
  getActivity(@Query() query: QueryActivityDto) {
    return this.adminService.getActivity(query);
  }
}
