import {
  Controller,
  Get,
  Post,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ContactService } from './contact.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class ContactController {
  constructor(private readonly contactService: ContactService) {}

  /**
   * GET /api/users/:id/contact — get contact details (masked unless authorized)
   */
  @Get(':id/contact')
  getUserContact(@CurrentUser() user: any, @Param('id') targetUserId: string) {
    return this.contactService.getUserContact(user.id, targetUserId);
  }

  /**
   * POST /api/users/:id/reveal-contact — reveal contact details (audited in DB)
   */
  @Post(':id/reveal-contact')
  revealUserContact(@CurrentUser() user: any, @Param('id') targetUserId: string) {
    return this.contactService.revealUserContact(user.id, targetUserId);
  }
}

