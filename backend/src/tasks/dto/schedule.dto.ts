import {
  IsString,
  IsOptional,
  IsIn,
  IsArray,
  IsUUID,
  IsDateString,
  IsBoolean,
  IsNotEmpty,
  MaxLength,
  ValidateIf,
} from 'class-validator'
import type { ScheduleRepeat } from '../entities/schedule.entity'

export class CreateScheduleDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  title: string

  @IsOptional()
  @IsString()
  description?: string

  @IsDateString()
  startAt: string

  // Fix: null 허용 필드 ValidateIf 추가
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsDateString()
  endAt?: string | null

  @IsOptional()
  @IsBoolean()
  allDay?: boolean

  @IsOptional()
  @IsIn(['none', 'daily', 'weekly', 'monthly'])
  repeat?: ScheduleRepeat

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsString()
  @MaxLength(20)
  color?: string | null

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsString()
  @MaxLength(300)
  location?: string | null

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsArray()
  @IsUUID('4', { each: true })
  attendees?: string[] | null

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsUUID()
  groupId?: string | null

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsUUID()
  projectId?: string | null

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsUUID()
  taskId?: string | null

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsUUID()
  meetingId?: string | null
}

export class UpdateScheduleDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  title?: string

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsString()
  description?: string | null

  @IsOptional()
  @IsDateString()
  startAt?: string

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsDateString()
  endAt?: string | null

  @IsOptional()
  @IsBoolean()
  allDay?: boolean

  @IsOptional()
  @IsIn(['none', 'daily', 'weekly', 'monthly'])
  repeat?: ScheduleRepeat

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsString()
  @MaxLength(20)
  color?: string | null

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsString()
  @MaxLength(300)
  location?: string | null

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsArray()
  @IsUUID('4', { each: true })
  attendees?: string[] | null

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsUUID()
  groupId?: string | null

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsUUID()
  projectId?: string | null

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsUUID()
  taskId?: string | null
}

export class ScheduleQueryDto {
  @IsOptional()
  @IsUUID()
  groupId?: string

  @IsOptional()
  @IsUUID()
  projectId?: string

  @IsOptional()
  @IsDateString()
  from?: string

  @IsOptional()
  @IsDateString()
  to?: string
}
