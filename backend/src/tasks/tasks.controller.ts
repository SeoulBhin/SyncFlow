import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common'
import { TasksService } from './tasks.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'

@Controller('tasks')
@UseGuards(JwtAuthGuard)
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get()
  list() {
    return this.tasksService.listAll()
  }

  @Get(':id')
  getOne(@Param('id') id: string) {
    return this.tasksService.getOne(id)
  }

  @Post()
  create(
    @Body()
    body: {
      title: string
      assignee?: string | null
      dueDate?: string | null
      status?: string
    },
  ) {
    return this.tasksService.create(body)
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body()
    body: {
      title?: string
      assignee?: string | null
      dueDate?: string | null
      status?: string
    },
  ) {
    return this.tasksService.update(id, body)
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id') id: string) {
    await this.tasksService.remove(id)
  }
}
