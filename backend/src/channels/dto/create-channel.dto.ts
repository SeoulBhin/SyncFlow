import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import type { ChannelType } from '../entities/channel.entity';

export class CreateChannelDto {
  @IsString()
  @IsNotEmpty()
  groupId: string;

  @IsEnum(['channel', 'dm', 'project'])
  @IsOptional()
  type?: ChannelType;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  /** DM 상대방 userId (type=dm 일 때) */
  @IsString()
  @IsOptional()
  targetUserId?: string;

  @IsString()
  @IsOptional()
  targetUserName?: string;
}
