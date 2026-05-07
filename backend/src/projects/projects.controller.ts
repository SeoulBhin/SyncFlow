import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common'
import { ProjectsService } from './projects.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { CreateProjectDto } from './dto/create-project.dto'
import { UpdateProjectDto } from './dto/update-project.dto'
import { User } from '../auth/entities/user.entity'

@Controller()
@UseGuards(JwtAuthGuard)
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  /* ── POST /api/projects ── */
  @Post('projects')
  createProject(@Req() req: { user: User }, @Body() dto: CreateProjectDto) {
    return this.projectsService.createProject(req.user.id, dto)
  }

  /* ── GET /api/groups/:id/projects ── */
  @Get('groups/:id/projects')
  getGroupProjects(@Req() req: { user: User }, @Param('id') id: string) {
    return this.projectsService.getGroupProjects(id, req.user.id)
  }

  /* ── GET /api/projects/:id ── */
  @Get('projects/:id')
  getProject(@Req() req: { user: User }, @Param('id') id: string) {
    return this.projectsService.getProject(id, req.user.id)
  }

  /* ── PUT /api/projects/:id ── */
  @Put('projects/:id')
  updateProject(
    @Req() req: { user: User },
    @Param('id') id: string,
    @Body() dto: UpdateProjectDto,
  ) {
    return this.projectsService.updateProject(id, req.user.id, dto)
  }

  /* ── DELETE /api/projects/:id ── */
  @Delete('projects/:id')
  @HttpCode(HttpStatus.OK)
  deleteProject(@Req() req: { user: User }, @Param('id') id: string) {
    return this.projectsService.deleteProject(id, req.user.id)
  }
}
