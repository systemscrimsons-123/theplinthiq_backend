import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ThreadsService } from './threads.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SendMessageDto } from './dto/thread.dto';

@Controller('threads')
@UseGuards(JwtAuthGuard)
export class ThreadsController {
  constructor(private readonly threadsService: ThreadsService) {}

  /**
   * GET /api/threads — list my active conversation threads
   */
  @Get()
  getUserThreads(@CurrentUser() user: any) {
    return this.threadsService.getUserThreads(user.id);
  }

  /**
   * GET /api/threads/:id — view thread messages
   */
  @Get(':id')
  getThread(@CurrentUser() user: any, @Param('id') id: string) {
    return this.threadsService.getThread(user.id, id);
  }

  /**
   * POST /api/threads/:id/messages — send message in thread
   */
  @Post(':id/messages')
  sendMessage(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.threadsService.sendMessage(user.id, id, dto);
  }
}

