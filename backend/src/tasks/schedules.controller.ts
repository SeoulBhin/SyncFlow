import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common'
import { SchedulesService } from './schedules.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import {
  CurrentUser,
  type CurrentUserPayload,
} from '../auth/decorators/current-user.decorator'
import {
  CreateScheduleDto,
  UpdateScheduleDto,
  ScheduleQueryDto,
} from './dto/schedule.dto'

@Controller('schedules')
@UseGuards(JwtAuthGuard)
export class SchedulesController {
  constructor(private readonly schedulesService: SchedulesService) {}

  /** GET /api/schedules — 내 일정 목록 (기간/그룹/프로젝트 필터) */
  @Get()
  list(
    @CurrentUser() user: CurrentUserPayload,
    @Query() query: ScheduleQueryDto,
  ) {
    return this.schedulesService.list(query, user.userId)
  }

  /** GET /api/schedules/upcoming — 앞으로 N일 이내 일정 */
  @Get('upcoming')
  upcoming(
    @CurrentUser() user: CurrentUserPayload,
    @Query('days') days?: string,
  ) {
    return this.schedulesService.upcoming(
      user.userId,
      days ? parseInt(days, 10) : 7,
    )
  }

  /** GET /api/schedules/group/:groupId — 그룹 전체 일정 */
  @Get('group/:groupId')
  listByGroup(
    @Param('groupId') groupId: string,
    @Query() query: ScheduleQueryDto,
  ) {
    return this.schedulesService.listByGroup(groupId, query)
  }

  /** GET /api/schedules/:id */
  @Get(':id')
  getOne(@Param('id') id: string) {
    return this.schedulesService.getOne(id)
  }

  /** POST /api/schedules */
  @Post()
  create(
    @Body() dto: CreateScheduleDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.schedulesService.create(dto, user.userId)
  }

  /** PATCH /api/schedules/:id */
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateScheduleDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.schedulesService.update(id, dto, user.userId)
  }

  /** DELETE /api/schedules/:id */
  @Delete(':id')
  @HttpCode(204)
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    await this.schedulesService.remove(id, user.userId)
  }

  /** POST /api/schedules/:id/attendees/:uid — 참여자 추가 */
  @Post(':id/attendees/:uid')
  @HttpCode(200)
  addAttendee(@Param('id') id: string, @Param('uid') uid: string) {
    return this.schedulesService.updateAttendees(id, uid, 'add')
  }

  /** DELETE /api/schedules/:id/attendees/:uid — 참여자 제거 */
  @Delete(':id/attendees/:uid')
  @HttpCode(200)
  removeAttendee(@Param('id') id: string, @Param('uid') uid: string) {
    return this.schedulesService.updateAttendees(id, uid, 'remove')
  }
}
