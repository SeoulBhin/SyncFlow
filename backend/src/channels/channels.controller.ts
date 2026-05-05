import { Controller, Get, Post, Put, Param, Body, UseGuards, HttpCode } from '@nestjs/common';
import { IsNotEmpty, IsString, Length } from 'class-validator';
import { ChannelsService } from './channels.service';
import { CreateChannelDto } from './dto/create-channel.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  CurrentUser,
  type CurrentUserPayload,
} from '../auth/decorators/current-user.decorator';

class JoinByCodeDto {
  @IsString()
  @IsNotEmpty()
  @Length(6, 6)
  code: string;
}

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

  /** POST /api/channels/:channelId/join */
  @Post('channels/:channelId/join')
  @HttpCode(200)
  async joinChannel(
    @Param('channelId') channelId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    await this.channelsService.joinChannel(channelId, user.userId, user.userName);
    return { ok: true };
  }

  /** POST /api/channels/join-by-code */
  @Post('channels/join-by-code')
  @HttpCode(200)
  joinByCode(
    @Body() dto: JoinByCodeDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.channelsService.joinByCode(dto.code, user.userId, user.userName);
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
