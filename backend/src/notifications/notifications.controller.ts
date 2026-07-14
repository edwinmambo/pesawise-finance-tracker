import { Controller, Get, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}

  @Get()
  list(@CurrentUser('userId') userId: string) {
    return this.service.listForUser(userId);
  }

  @Get('unread-count')
  unread(@CurrentUser('userId') userId: string) {
    return this.service.unreadCount(userId);
  }

  @Patch(':id/read')
  markRead(@CurrentUser('userId') userId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.markRead(userId, id);
  }

  @Post('read-all')
  markAll(@CurrentUser('userId') userId: string) {
    return this.service.markAllRead(userId);
  }
}
