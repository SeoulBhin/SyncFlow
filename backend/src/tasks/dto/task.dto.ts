import {
  IsString,
  IsOptional,
  IsIn,
  IsArray,
  IsUUID,
  IsDateString,
  IsInt,
  Min,
  MaxLength,
  IsNotEmpty,
  ValidateIf,
  ValidateNested,
} from 'class-validator'
import { Transform, Type } from 'class-transformer'
import type { TaskStatus, TaskPriority } from '../entities/task.entity'

export class CreateTaskDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  title: string

  @IsOptional()
  @IsString()
  description?: string

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsString()
  @MaxLength(100)
  assignee?: string | null

  // Fix: null 전송 시 @IsUUID()가 오류 반환하므로 ValidateIf 추가
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsUUID()
  assigneeId?: string | null

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsDateString()
  dueDate?: string | null

  @IsOptional()
  @IsIn(['todo', 'in-progress', 'done'])
  status?: TaskStatus

  @IsOptional()
  @IsIn(['low', 'medium', 'high', 'urgent'])
  priority?: TaskPriority

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
  @IsArray()
  @IsString({ each: true })
  tags?: string[] | null

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number
}

export class UpdateTaskDto {
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
  @ValidateIf((_, v) => v !== null)
  @IsString()
  @MaxLength(100)
  assignee?: string | null

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsUUID()
  assigneeId?: string | null

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsDateString()
  dueDate?: string | null

  @IsOptional()
  @IsIn(['todo', 'in-progress', 'done'])
  status?: TaskStatus

  @IsOptional()
  @IsIn(['low', 'medium', 'high', 'urgent'])
  priority?: TaskPriority

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
  @IsArray()
  @IsString({ each: true })
  tags?: string[] | null

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number
}

export class TaskQueryDto {
  @IsOptional()
  @IsUUID()
  groupId?: string

  @IsOptional()
  @IsUUID()
  projectId?: string

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
  @IsDateString()
  dueDateFrom?: string

  @IsOptional()
  @IsDateString()
  dueDateTo?: string

  @IsOptional()
  @Transform(({ value }: { value: string }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  limit?: number

  @IsOptional()
  @Transform(({ value }: { value: string }) => parseInt(value, 10))
  @IsInt()
  @Min(0)
  offset?: number
}

export class BulkUpdateStatusDto {
  @IsArray()
  @IsUUID('4', { each: true })
  ids: string[]

  @IsIn(['todo', 'in-progress', 'done'])
  status: TaskStatus
}

// Fix: 배열 내부 아이템 검증을 위해 클래스 분리
export class ReorderItem {
  @IsUUID()
  id: string

  @IsInt()
  @Min(0)
  sortOrder: number
}

export class ReorderTasksDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReorderItem)
  orders: ReorderItem[]
}
