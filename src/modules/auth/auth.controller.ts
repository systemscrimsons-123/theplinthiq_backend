import {
  Body,
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import {
  SignupDto,
  LoginDto,
  VerifyEmailDto,
  ResendVerificationDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  UpdateUserStatusDto,
  ChangePasswordDto,
  UpdateSettingsDto,
  DeleteAccountDto,
} from './dto/auth.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * POST /api/auth/signup
   * Creates an account with status 'pending_verification' and sends/generates an email verification token.
   * Does NOT return a login token — user must verify email first.
   */
  @Post('signup')
  signup(@Body() dto: SignupDto) {
    return this.authService.signup(dto);
  }

  /**
   * POST /api/auth/verify-email
   * Verifies the email token.
   */
  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.authService.verifyEmail(dto);
  }

  /**
   * GET /api/auth/verify-email?token=...&activate=true
   * Link-based verification (from browser click).
   */
  @Get('verify-email')
  verifyEmailQuery(
    @Query('token') token: string,
    @Query('activate') activate?: string,
  ) {
    return this.authService.verifyEmail({
      token,
      activateImmediately: activate === 'true',
    });
  }

  /**
   * POST /api/auth/resend-verification
   * Resends email verification link.
   */
  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  resendVerification(@Body() dto: ResendVerificationDto) {
    return this.authService.resendVerification(dto);
  }

  /**
   * POST /api/auth/login
   * Authenticates user credentials.
   * Enforces:
   * 1. Email MUST be verified (emailVerifiedAt != null)
   * 2. Status MUST NOT be 'pending_verification'
   * 3. Status MUST NOT be 'inactive'
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  /**
   * POST /api/auth/forgot-password
   * Sends a password reset link.
   */
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto.email);
  }

  /**
   * POST /api/auth/reset-password
   * Resets password using token.
   */
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  /**
   * GET /api/auth/me
   * Returns authenticated user profile.
   */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: any) {
    return this.authService.me(user.id);
  }

  /**
   * PATCH /api/auth/change-password
   * Authenticated user changes their password securely.
   */
  @Patch('change-password')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  changePassword(
    @CurrentUser() user: any,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(user.id, dto);
  }

  /**
   * PATCH /api/auth/settings
   * Authenticated user updates their application settings and preferences.
   */
  @Patch('settings')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  updateSettings(
    @CurrentUser() user: any,
    @Body() dto: UpdateSettingsDto,
  ) {
    return this.authService.updateSettings(user.id, dto);
  }

  /**
   * GET /api/auth/settings
   * Authenticated user fetches their application settings and preferences.
   */
  @Get('settings')
  @UseGuards(JwtAuthGuard)
  getSettings(@CurrentUser() user: any) {
    return this.authService.getSettings(user.id);
  }

  /**
   * POST /api/auth/delete-account
   * Authenticated user confirms account deactivation.
   */
  @Post('delete-account')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  deleteAccount(
    @CurrentUser() user: any,
    @Body() dto: DeleteAccountDto,
  ) {
    return this.authService.deleteAccount(user.id, dto);
  }

  /**
   * POST /api/auth/activate/:id
   * Dev/Admin helper: Activates user, verifies email, and sets verificationStatus to 'verified'.
   * Allows fast testing of active workflows in development.
   */
  @Post('activate/:id')
  @HttpCode(HttpStatus.OK)
  activateUser(@Param('id') id: string) {
    return this.authService.activateUser(id);
  }

  /**
   * PATCH /api/auth/users/:id/status
   * Admin/Dev helper: Updates user account status and verification status.
   */
  @Patch('users/:id/status')
  @HttpCode(HttpStatus.OK)
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateUserStatusDto,
  ) {
    return this.authService.updateUserStatus(id, dto);
  }
}
