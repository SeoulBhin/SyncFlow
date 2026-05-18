import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Schedule } from './entities/schedule.entity'
import {
  CreateScheduleDto,
  UpdateScheduleDto,
  ScheduleQueryDto,
} from './dto/schedule.dto'

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function assertUuid(v: string, label = 'id'): void {
  if (!UUID_RE.test(v)) {
    throw new BadRequestException(
      `${label}가 유효한 UUID 형식이 아닙니다: ${v}`,
    )
  }
}

@Injectable()
export class SchedulesService {
  private readonly logger = new Logger(SchedulesService.name)

  constructor(
    @InjectRepository(Schedule)
    private readonly scheduleRepo: Repository<Schedule>,
  ) {}

  async list(query: ScheduleQueryDto, userId: string) {
    assertUuid(userId, 'userId')

    // Fix: attendees는 JSONB 배열 — ANY(uuid[]) 대신 @> 연산자 사용
    const qb = this.scheduleRepo
      .createQueryBuilder('s')
      .where(
        `(s.createdBy = :uid OR s.attendees @> :uidJson::jsonb)`,
        { uid: userId, uidJson: JSON.stringify([userId]) },
      )
      .orderBy('s.startAt', 'ASC')

    if (query.groupId) {
      assertUuid(query.groupId, 'groupId')
      qb.andWhere('s.groupId = :groupId', { groupId: query.groupId })
    }
    if (query.projectId) {
      assertUuid(query.projectId, 'projectId')
      qb.andWhere('s.projectId = :projectId', { projectId: query.projectId })
    }
    if (query.from) {
      qb.andWhere('s.startAt >= :from', { from: new Date(query.from) })
    }
    if (query.to) {
      // Fix: 문자열 조합 대신 Date 객체로 처리
      const toDate = new Date(query.to)
      toDate.setHours(23, 59, 59, 999)
      qb.andWhere('s.startAt <= :to', { to: toDate })
    }

    return qb.getMany()
  }

  async listByGroup(groupId: string, query: ScheduleQueryDto) {
    assertUuid(groupId, 'groupId')

    const qb = this.scheduleRepo
      .createQueryBuilder('s')
      .where('s.groupId = :groupId', { groupId })
      .orderBy('s.startAt', 'ASC')

    if (query.from) {
      qb.andWhere('s.startAt >= :from', { from: new Date(query.from) })
    }
    if (query.to) {
      const toDate = new Date(query.to)
      toDate.setHours(23, 59, 59, 999)
      qb.andWhere('s.startAt <= :to', { to: toDate })
    }

    return qb.getMany()
  }

  async getOne(id: string): Promise<Schedule> {
    assertUuid(id, 'scheduleId')
    const schedule = await this.scheduleRepo.findOne({ where: { id } })
    if (!schedule) throw new NotFoundException('일정을 찾을 수 없습니다')
    return schedule
  }

  async create(dto: CreateScheduleDto, createdBy: string): Promise<Schedule> {
    assertUuid(createdBy, 'userId')

    const startAt = new Date(dto.startAt)
    if (isNaN(startAt.getTime())) {
      throw new BadRequestException('startAt이 올바른 날짜 형식이 아닙니다')
    }

    const endAt = dto.endAt ? new Date(dto.endAt) : null
    if (endAt && endAt <= startAt) {
      throw new BadRequestException('endAt은 startAt 이후여야 합니다')
    }

    const schedule = this.scheduleRepo.create({
      title: dto.title.trim(),
      description: dto.description ?? null,
      startAt,
      endAt,
      allDay: dto.allDay ?? false,
      repeat: dto.repeat ?? 'none',
      color: dto.color ?? null,
      location: dto.location ?? null,
      attendees: dto.attendees ?? null,
      groupId: dto.groupId ?? null,
      projectId: dto.projectId ?? null,
      taskId: dto.taskId ?? null,
      meetingId: dto.meetingId ?? null,
      createdBy,
    })

    return this.scheduleRepo.save(schedule)
  }

  async update(id: string, dto: UpdateScheduleDto, userId: string): Promise<Schedule> {
    assertUuid(id, 'scheduleId')
    assertUuid(userId, 'userId')

    const schedule = await this.getOne(id)

    if (schedule.createdBy && schedule.createdBy !== userId) {
      throw new ForbiddenException('일정 생성자만 수정할 수 있습니다')
    }

    const startAt = dto.startAt ? new Date(dto.startAt) : schedule.startAt
    const endAt =
      dto.endAt !== undefined
        ? dto.endAt ? new Date(dto.endAt) : null
        : schedule.endAt

    if (endAt && endAt <= startAt) {
      throw new BadRequestException('endAt은 startAt 이후여야 합니다')
    }

    if (dto.title !== undefined) schedule.title = dto.title.trim()
    if (dto.description !== undefined) schedule.description = dto.description
    if (dto.startAt !== undefined) schedule.startAt = startAt
    if (dto.endAt !== undefined) schedule.endAt = endAt
    if (dto.allDay !== undefined) schedule.allDay = dto.allDay
    if (dto.repeat !== undefined) schedule.repeat = dto.repeat
    if (dto.color !== undefined) schedule.color = dto.color
    if (dto.location !== undefined) schedule.location = dto.location
    if (dto.attendees !== undefined) schedule.attendees = dto.attendees
    if (dto.groupId !== undefined) schedule.groupId = dto.groupId
    if (dto.projectId !== undefined) schedule.projectId = dto.projectId
    if (dto.taskId !== undefined) schedule.taskId = dto.taskId

    return this.scheduleRepo.save(schedule)
  }

  async remove(id: string, userId: string): Promise<void> {
    assertUuid(id, 'scheduleId')
    assertUuid(userId, 'userId')

    const schedule = await this.getOne(id)

    if (schedule.createdBy && schedule.createdBy !== userId) {
      throw new ForbiddenException('일정 생성자만 삭제할 수 있습니다')
    }

    await this.scheduleRepo.delete(id)
  }

  async updateAttendees(id: string, attendeeId: string, action: 'add' | 'remove'): Promise<Schedule> {
    assertUuid(id, 'scheduleId')
    assertUuid(attendeeId, 'attendeeId')

    const schedule = await this.getOne(id)
    const current: string[] = Array.isArray(schedule.attendees) ? schedule.attendees : []

    if (action === 'add') {
      if (!current.includes(attendeeId)) {
        schedule.attendees = [...current, attendeeId]
      }
    } else {
      const filtered = current.filter((uid) => uid !== attendeeId)
      // Fix: 빈 배열이면 null로 저장
      schedule.attendees = filtered.length > 0 ? filtered : null
    }

    return this.scheduleRepo.save(schedule)
  }

  async upcoming(userId: string, days = 7): Promise<Schedule[]> {
    assertUuid(userId, 'userId')

    const now = new Date()
    const limitDate = new Date(now)
    limitDate.setDate(limitDate.getDate() + days)

    // Fix: JSONB @> 연산자 사용
    return this.scheduleRepo
      .createQueryBuilder('s')
      .where(
        `(s.createdBy = :uid OR s.attendees @> :uidJson::jsonb)`,
        { uid: userId, uidJson: JSON.stringify([userId]) },
      )
      .andWhere('s.startAt >= :now', { now })
      .andWhere('s.startAt <= :limit', { limit: limitDate })
      .orderBy('s.startAt', 'ASC')
      .getMany()
  }
}
