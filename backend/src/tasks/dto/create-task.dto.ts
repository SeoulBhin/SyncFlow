import {
  IsArray,
  IsDateString,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator'
import { type TaskStatus, type TaskPriority } from '../entities/task.entity'

export class CreateTaskDto {
  @IsString()
  @MaxLength(300)
  title: string

  @IsOptional()
  @IsString()
  description?: string

  @IsOptional()
  @IsIn(['todo', 'in-progress', 'done'])
  status?: TaskStatus

  @IsOptional()
  @IsIn(['low', 'medium', 'high', 'urgent'])
  priority?: TaskPriority

  @IsOptional()
  @IsUUID()
  assigneeId?: string

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  assigneeIds?: string[]

  @IsOptional()
  @IsDateString()
  startDate?: string

  @IsOptional()
  @IsDateString()
  dueDate?: string

  @IsOptional()
  @IsUUID()
  projectId?: string

  @IsOptional()
  @IsUUID()
  groupId?: string

  @IsOptional()
  @IsUUID()
  parentTaskId?: string

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[]

  @IsOptional()
  @IsNumber()
  sortOrder?: number

  @IsOptional()
  @IsString()
  assignee?: string
}
