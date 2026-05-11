import { IsDateString, IsIn, IsOptional, IsString, IsUUID } from 'class-validator'

export class TaskFilterDto {
  @IsOptional()
  @IsString()
  status?: string

  @IsOptional()
  @IsString()
  priority?: string

  @IsOptional()
  @IsUUID()
  assigneeId?: string

  @IsOptional()
  @IsDateString()
  dateFrom?: string

  @IsOptional()
  @IsDateString()
  dateTo?: string

  @IsOptional()
  @IsString()
  keyword?: string

  @IsOptional()
  @IsIn(['dueDate', 'priority', 'createdAt', 'sortOrder', 'startDate'])
  sort?: 'dueDate' | 'priority' | 'createdAt' | 'sortOrder' | 'startDate'

  @IsOptional()
  @IsIn(['asc', 'desc'])
  order?: 'asc' | 'desc'
}
