import { IsNotEmpty, IsString } from 'class-validator';

export class MessageReactionDto {
  @IsString()
  @IsNotEmpty()
  emoji: string;
}
