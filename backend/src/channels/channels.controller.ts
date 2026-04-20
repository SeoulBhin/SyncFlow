import { Controller, Get, Post, Put, Param, Body, UseGuards } from '@nestjs/common';
import { ChannelsService } from './channels.service';
import { CreateChannelDto } from './dto/create-channel.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  CurrentUser,
  type CurrentUserPayload,
} from '../auth/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller()
export class ChannelsController {
  constructor(private readonly channelsService: ChannelsService) {}

  /** GET /api/groups/:groupId/channels */
  @Get('groups/:groupId/channels')
  getGroupChannels(
    @Param('groupId') groupId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.channelsService.getGroupChannels(groupId, user.userId);
  }

  /** POST /api/channels */
  @Post('channels')
  createChannel(
    @Body() dto: CreateChannelDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.channelsService.createChannel(dto, user.userId, user.userName);
  }

  /** PUT /api/channels/:channelId/read */
  @Put('channels/:channelId/read')
  markRead(
    @Param('channelId') channelId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.channelsService.markRead(channelId, user.userId);
  }
}
