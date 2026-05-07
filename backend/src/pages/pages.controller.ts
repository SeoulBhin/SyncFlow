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
import { PagesService } from './pages.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { CreatePageDto } from './dto/create-page.dto'
import { UpdatePageDto, UpdatePageTitleDto } from './dto/update-page.dto'
import { User } from '../auth/entities/user.entity'

@Controller()
@UseGuards(JwtAuthGuard)
export class PagesController {
  constructor(private readonly pagesService: PagesService) {}

  /* ── POST /api/pages ── */
  @Post('pages')
  createPage(@Req() req: { user: User }, @Body() dto: CreatePageDto) {
    return this.pagesService.createPage(req.user.id, dto)
  }

  /* ── GET /api/projects/:id/pages ── */
  @Get('projects/:id/pages')
  getProjectPages(@Req() req: { user: User }, @Param('id') id: string) {
    return this.pagesService.getProjectPages(id, req.user.id)
  }

  /* ── GET /api/pages/:id ── */
  @Get('pages/:id')
  getPage(@Req() req: { user: User }, @Param('id') id: string) {
    return this.pagesService.getPage(id, req.user.id)
  }

  /* ── PUT /api/pages/:id ── */
  @Put('pages/:id')
  updatePage(
    @Req() req: { user: User },
    @Param('id') id: string,
    @Body() dto: UpdatePageDto,
  ) {
    return this.pagesService.updatePage(id, req.user.id, dto)
  }

  /* ── PUT /api/pages/:id/title ── */
  @Put('pages/:id/title')
  updatePageTitle(
    @Req() req: { user: User },
    @Param('id') id: string,
    @Body() dto: UpdatePageTitleDto,
  ) {
    return this.pagesService.updatePageTitle(id, req.user.id, dto)
  }

  /* ── DELETE /api/pages/:id ── */
  @Delete('pages/:id')
  @HttpCode(HttpStatus.OK)
  deletePage(@Req() req: { user: User }, @Param('id') id: string) {
    return this.pagesService.deletePage(id, req.user.id)
  }
}
