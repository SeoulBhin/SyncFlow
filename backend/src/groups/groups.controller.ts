import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common'
import { GroupsService } from './groups.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { CreateGroupDto } from './dto/create-group.dto'
import { UpdateGroupDto } from './dto/update-group.dto'
import { JoinGroupDto } from './dto/join-group.dto'
import { User } from '../auth/entities/user.entity'

@Controller('groups')
@UseGuards(JwtAuthGuard)
export class GroupsController {
  constructor(private readonly groupsService: GroupsService) {}

  /* ── POST /api/groups ── */
  @Post()
  createGroup(@Req() req: { user: User }, @Body() dto: CreateGroupDto) {
    return this.groupsService.createGroup(req.user.id, dto)
  }

  /* ── GET /api/groups ── */
  @Get()
  getMyGroups(@Req() req: { user: User }) {
    return this.groupsService.getMyGroups(req.user.id)
  }

  /* ── GET /api/groups/search?q= ── */
  @Get('search')
  searchGroups(@Query('q') q: string) {
    return this.groupsService.searchGroups(q ?? '')
  }

  /* ── POST /api/groups/join ── */
  @Post('join')
  joinGroup(@Req() req: { user: User }, @Body() dto: JoinGroupDto) {
    return this.groupsService.joinGroup(req.user.id, dto)
  }

  /* ── GET /api/groups/:id ── */
  @Get(':id')
  getGroup(@Req() req: { user: User }, @Param('id') id: string) {
    return this.groupsService.getGroup(id, req.user.id)
  }

  /* ── PUT /api/groups/:id ── */
  @Put(':id')
  updateGroup(
    @Req() req: { user: User },
    @Param('id') id: string,
    @Body() dto: UpdateGroupDto,
  ) {
    return this.groupsService.updateGroup(id, req.user.id, dto)
  }

  /* ── DELETE /api/groups/:id ── */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  deleteGroup(@Req() req: { user: User }, @Param('id') id: string) {
    return this.groupsService.deleteGroup(id, req.user.id)
  }

  /* ── POST /api/groups/:id/regenerate-code ── */
  @Post(':id/regenerate-code')
  regenerateCode(@Req() req: { user: User }, @Param('id') id: string) {
    return this.groupsService.regenerateInviteCode(id, req.user.id)
  }

  /* ── GET /api/groups/:id/members ── */
  @Get(':id/members')
  getMembers(@Req() req: { user: User }, @Param('id') id: string) {
    return this.groupsService.getMembers(id, req.user.id)
  }

  /* ── PUT /api/groups/:id/members/:uid ── */
  @Put(':id/members/:uid')
  updateMemberRole(
    @Req() req: { user: User },
    @Param('id') id: string,
    @Param('uid') uid: string,
    @Body('role') role: 'owner' | 'admin' | 'member' | 'guest',
  ) {
    return this.groupsService.updateMemberRole(id, req.user.id, uid, role)
  }

  /* ── DELETE /api/groups/:id/members/:uid ── */
  @Delete(':id/members/:uid')
  @HttpCode(HttpStatus.OK)
  removeMember(
    @Req() req: { user: User },
    @Param('id') id: string,
    @Param('uid') uid: string,
  ) {
    return this.groupsService.removeMember(id, req.user.id, uid)
  }
}
