import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards, HttpCode } from '@nestjs/common';
import { IsArray, IsNotEmpty, IsString, IsUUID, Length, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
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

class AddMemberItem {
  @IsUUID()
  userId: string;

  @IsString()
  userName: string;
}

class AddMembersDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AddMemberItem)
  members: AddMemberItem[];
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

  /** POST /api/channels/:channelId/members — 채널 멤버 다중 초대 (체크박스) */
  @Post('channels/:channelId/members')
  @HttpCode(200)
  async addMembers(
    @Param('channelId') channelId: string,
    @Body() dto: AddMembersDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    await this.channelsService.addMembers(channelId, dto.members, user.userId);
    return { ok: true, added: dto.members.length };
  }

  /** PUT /api/channels/:channelId/read */
  @Put('channels/:channelId/read')
  markRead(
    @Param('channelId') channelId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.channelsService.markRead(channelId, user.userId);
  }

  /** DELETE /api/channels/:channelId — DM은 본인 leave, 일반 채널은 채널 삭제 */
  @Delete('channels/:channelId')
  @HttpCode(200)
  async deleteChannel(
    @Param('channelId') channelId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    await this.channelsService.deleteChannel(channelId, user.userId);
    return { ok: true };
  }

  /** GET /api/channels/:channelId/members — 채널 멤버 목록 (멤버여야 가능) */
  @Get('channels/:channelId/members')
  async getMembers(
    @Param('channelId') channelId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.channelsService.getMembers(channelId, user.userId);
  }

  /** PUT /api/channels/:channelId — 채널 이름/설명 수정 (멤버여야 가능) */
  @Put('channels/:channelId')
  async updateChannel(
    @Param('channelId') channelId: string,
    @Body() dto: { name?: string; description?: string | null },
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.channelsService.updateChannel(channelId, user.userId, dto);
  }

  /** DELETE /api/channels/:channelId/members/:userId — 다른 멤버 제거 (호출자 자신은 leave 흐름 사용) */
  @Delete('channels/:channelId/members/:targetUserId')
  @HttpCode(200)
  async removeMember(
    @Param('channelId') channelId: string,
    @Param('targetUserId') targetUserId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    await this.channelsService.removeMember(channelId, targetUserId, user.userId);
    return { ok: true };
  }
}
