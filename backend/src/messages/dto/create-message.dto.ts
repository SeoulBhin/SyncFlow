import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateMessageDto {
  @IsString()
  @IsNotEmpty()
  content: string;

  @IsUUID()
  @IsOptional()
  parentId?: string;
}
