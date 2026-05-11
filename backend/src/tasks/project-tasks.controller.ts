import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common'
import { TasksService } from './tasks.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { TaskFilterDto } from './dto/task-filter.dto'
import { CustomFieldType } from './entities/custom-field-definition.entity'

@Controller('projects')
@UseGuards(JwtAuthGuard)
export class ProjectTasksController {
  constructor(private readonly tasksService: TasksService) {}

  /** GET /api/projects/:id/tasks */
  @Get(':id/tasks')
  listTasks(
    @Param('id') projectId: string,
    @Query() filter: TaskFilterDto,
  ) {
    return this.tasksService.listByProject(projectId, filter)
  }

  /** GET /api/projects/:id/custom-fields */
  @Get(':id/custom-fields')
  getCustomFields(@Param('id') projectId: string) {
    return this.tasksService.getCustomFieldDefs(projectId)
  }

  /** POST /api/projects/:id/custom-fields */
  @Post(':id/custom-fields')
  createCustomField(
    @Param('id') projectId: string,
    @Body() body: { name: string; type: CustomFieldType; options?: Record<string, unknown>[] },
  ) {
    return this.tasksService.createCustomFieldDef(projectId, body)
  }
}
