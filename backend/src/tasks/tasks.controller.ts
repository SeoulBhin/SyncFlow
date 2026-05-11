import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common'
import { TasksService, BulkUpdateStatusDto, ReorderTasksDto } from './tasks.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import {
  CurrentUser,
  type CurrentUserPayload,
} from '../auth/decorators/current-user.decorator'
import { CreateTaskDto } from './dto/create-task.dto'
import { UpdateTaskDto } from './dto/update-task.dto'
import { type TaskStatus } from './entities/task.entity'

@Controller('tasks')
@UseGuards(JwtAuthGuard)
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  // ── 고정 경로는 동적 :id 라우트보다 앞에 위치해야 한다 ─────────────────────

  /** GET /api/tasks — 내가 접근 가능한 작업 전체 (필터 옵션) */
  @Get()
  list(
    @CurrentUser() user: CurrentUserPayload,
    @Query('groupId') groupId?: string,
    @Query('projectId') projectId?: string,
    @Query('status') status?: string,
  ) {
    return this.tasksService.list({
      userId: user.userId,
      groupId,
      projectId,
      status: status as TaskStatus | undefined,
    })
  }

  /** GET /api/tasks/me */
  @Get('me')
  getMyTasks(@CurrentUser() user: CurrentUserPayload) {
    return this.tasksService.getMyTasks(user.userId)
  }

  /** GET /api/tasks/kanban */
  @Get('kanban')
  kanban(
    @Query('groupId') groupId?: string,
    @Query('projectId') projectId?: string,
  ) {
    return this.tasksService.kanban({ groupId, projectId })
  }

  /** GET /api/tasks/upcoming */
  @Get('upcoming')
  upcoming(
    @CurrentUser() user: CurrentUserPayload,
    @Query('days') days?: string,
  ) {
    return this.tasksService.upcoming(user.userId, days ? parseInt(days, 10) : 3)
  }

  /** GET /api/tasks/stats */
  @Get('stats')
  stats(
    @CurrentUser() user: CurrentUserPayload,
    @Query('groupId') groupId?: string,
    @Query('projectId') projectId?: string,
  ) {
    return this.tasksService.stats({ groupId, projectId, userId: user.userId })
  }

  /** POST /api/tasks/bulk-status */
  @Post('bulk-status')
  @HttpCode(200)
  bulkUpdateStatus(@Body() dto: BulkUpdateStatusDto) {
    return this.tasksService.bulkUpdateStatus(dto)
  }

  /** PUT /api/tasks/reorder */
  @Put('reorder')
  @HttpCode(200)
  reorder(@Body() dto: ReorderTasksDto) {
    return this.tasksService.reorder(dto)
  }

  // ── 동적 경로 (:id) ──────────────────────────────────────────────────────────

  /** POST /api/tasks */
  @Post()
  create(
    @Body() dto: CreateTaskDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.tasksService.createTask(dto, user.userId)
  }

  /** GET /api/tasks/:id */
  @Get(':id')
  getOne(@Param('id') id: string) {
    return this.tasksService.getTaskDetail(id)
  }

  /** PUT /api/tasks/:id */
  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateTaskDto) {
    return this.tasksService.updateTask(id, dto)
  }

  /** PATCH /api/tasks/:id — 부분 업데이트 (프론트 호환) */
  @Patch(':id')
  patch(@Param('id') id: string, @Body() dto: UpdateTaskDto) {
    return this.tasksService.updateTask(id, dto)
  }

  /** PUT /api/tasks/:id/status */
  @Put(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body('status') status: string,
  ) {
    return this.tasksService.updateStatus(id, status as TaskStatus)
  }

  /** PUT /api/tasks/:id/custom-fields */
  @Put(':id/custom-fields')
  upsertCustomFields(
    @Param('id') id: string,
    @Body() body: { values: Array<{ fieldId: string; value: unknown }> },
  ) {
    return this.tasksService.upsertCustomFieldValues(id, body.values ?? [])
  }

  /** DELETE /api/tasks/:id */
  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id') id: string): Promise<void> {
    await this.tasksService.remove(id)
  }
}
