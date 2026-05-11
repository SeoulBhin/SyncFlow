import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { DataSource, In, Repository } from 'typeorm'
import { Task, TaskStatus } from './entities/task.entity'
import { TaskAssignee } from './entities/task-assignee.entity'
import { CustomFieldDefinition, CustomFieldType } from './entities/custom-field-definition.entity'
import { CustomFieldValue } from './entities/custom-field-value.entity'
import { CreateTaskDto } from './dto/create-task.dto'
import { UpdateTaskDto } from './dto/update-task.dto'
import { TaskFilterDto } from './dto/task-filter.dto'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const ALLOWED_STATUS = new Set<TaskStatus>(['todo', 'in-progress', 'done'])
const ALLOWED_PRIORITY = new Set(['low', 'medium', 'high', 'urgent'])

function assertUuid(v: string, label = 'id'): void {
  if (!UUID_RE.test(v)) {
    throw new BadRequestException(`${label}가 유효한 UUID 형식이 아닙니다: ${v}`)
  }
}

const SORT_COLUMN_MAP: Record<string, string> = {
  dueDate: 't.dueDate',
  startDate: 't.startDate',
  priority: 't.priority',
  createdAt: 't.createdAt',
  sortOrder: 't.sortOrder',
}

export class BulkUpdateStatusDto {
  ids: string[]
  status: TaskStatus
}

export class ReorderTasksDto {
  orders: Array<{ id: string; sortOrder: number }>
}

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name)

  constructor(
    @InjectRepository(Task)
    private readonly taskRepo: Repository<Task>,
    @InjectRepository(TaskAssignee)
    private readonly assigneeRepo: Repository<TaskAssignee>,
    @InjectRepository(CustomFieldDefinition)
    private readonly fieldDefRepo: Repository<CustomFieldDefinition>,
    @InjectRepository(CustomFieldValue)
    private readonly fieldValueRepo: Repository<CustomFieldValue>,
    private readonly dataSource: DataSource,
  ) {}

  // ── 프로젝트 작업 목록 (필터/정렬) ──────────────────────────────────────────

  async listByProject(projectId: string, filter: TaskFilterDto): Promise<Task[]> {
    assertUuid(projectId, 'projectId')

    const qb = this.taskRepo
      .createQueryBuilder('t')
      .leftJoinAndSelect('t.assignees', 'ta')
      .where('t.projectId = :projectId', { projectId })

    if (filter.status) {
      qb.andWhere('t.status = :status', { status: filter.status })
    }
    if (filter.priority) {
      qb.andWhere('t.priority = :priority', { priority: filter.priority })
    }
    if (filter.assigneeId) {
      assertUuid(filter.assigneeId, 'assigneeId')
      qb.andWhere('(t.assigneeId = :aid OR ta.userId = :aid)', { aid: filter.assigneeId })
    }
    if (filter.dateFrom) {
      qb.andWhere('t.dueDate >= :from', { from: filter.dateFrom })
    }
    if (filter.dateTo) {
      qb.andWhere('t.dueDate <= :to', { to: filter.dateTo })
    }
    if (filter.keyword) {
      qb.andWhere('(t.title ILIKE :kw OR t.description ILIKE :kw)', {
        kw: `%${filter.keyword}%`,
      })
    }

    const sortCol = SORT_COLUMN_MAP[filter.sort ?? 'sortOrder'] ?? 't.sortOrder'
    const sortDir = (filter.order?.toUpperCase() as 'ASC' | 'DESC') ?? 'ASC'
    qb.orderBy(sortCol, sortDir).addOrderBy('t.createdAt', 'DESC')

    return qb.getMany()
  }

  // ── 내 작업 (대시보드) ───────────────────────────────────────────────────────

  async getMyTasks(userId: string): Promise<Task[]> {
    assertUuid(userId, 'userId')

    const assignedTaskIds = await this.assigneeRepo
      .find({ where: { userId }, select: ['taskId'] })
      .then((rows) => rows.map((r) => r.taskId))

    const qb = this.taskRepo
      .createQueryBuilder('t')
      .leftJoinAndSelect('t.assignees', 'ta')
      .where('t.status != :done', { done: 'done' })

    if (assignedTaskIds.length > 0) {
      qb.andWhere(
        '(t.assigneeId = :uid OR t.createdBy = :uid OR t.id IN (:...tids))',
        { uid: userId, tids: assignedTaskIds },
      )
    } else {
      qb.andWhere('(t.assigneeId = :uid OR t.createdBy = :uid)', { uid: userId })
    }

    return qb
      .orderBy('t.status', 'ASC')
      .addOrderBy('t.dueDate', 'ASC', 'NULLS LAST')
      .addOrderBy('t.sortOrder', 'ASC')
      .getMany()
  }

  // ── 작업 상세 (담당자 + 커스텀필드 + 서브태스크) ────────────────────────────

  async getTaskDetail(id: string): Promise<Task> {
    assertUuid(id, 'taskId')

    const task = await this.taskRepo
      .createQueryBuilder('t')
      .leftJoinAndSelect('t.assignees', 'ta')
      .leftJoinAndSelect('t.customFieldValues', 'cfv')
      .leftJoinAndSelect('t.subtasks', 'sub')
      .leftJoinAndSelect('sub.assignees', 'subta')
      .where('t.id = :id', { id })
      .getOne()

    if (!task) throw new NotFoundException('작업을 찾을 수 없습니다')
    return task
  }

  // ── 작업 생성 (트랜잭션 + 다중 담당자) ──────────────────────────────────────

  async createTask(dto: CreateTaskDto, createdBy: string): Promise<Task> {
    if (!dto.title?.trim()) throw new BadRequestException('title은 필수입니다')
    if (dto.status && !ALLOWED_STATUS.has(dto.status)) {
      throw new BadRequestException('올바르지 않은 status 값입니다')
    }
    if (dto.priority && !ALLOWED_PRIORITY.has(dto.priority)) {
      throw new BadRequestException('올바르지 않은 priority 값입니다')
    }

    return this.dataSource.transaction(async (em) => {
      const task = em.create(Task, {
        title: dto.title.trim(),
        description: dto.description ?? null,
        assignee: dto.assignee ?? null,
        assigneeId: dto.assigneeId ?? null,
        startDate: dto.startDate ?? null,
        dueDate: dto.dueDate ?? null,
        status: dto.status ?? 'todo',
        priority: dto.priority ?? 'medium',
        groupId: dto.groupId ?? null,
        projectId: dto.projectId ?? null,
        parentTaskId: dto.parentTaskId ?? null,
        tags: dto.tags ?? null,
        sortOrder: dto.sortOrder ?? 0,
        createdBy,
      })
      const saved = await em.save(Task, task)

      if (dto.assigneeIds && dto.assigneeIds.length > 0) {
        const assignees = dto.assigneeIds.map((userId) =>
          em.create(TaskAssignee, { taskId: saved.id, userId }),
        )
        await em.save(TaskAssignee, assignees)
      }

      return saved
    })
  }

  // ── 작업 수정 (트랜잭션 + 다중 담당자 교체) ─────────────────────────────────

  async updateTask(id: string, dto: UpdateTaskDto): Promise<Task> {
    assertUuid(id, 'taskId')
    if (dto.status && !ALLOWED_STATUS.has(dto.status)) {
      throw new BadRequestException('올바르지 않은 status 값입니다')
    }
    if (dto.priority && !ALLOWED_PRIORITY.has(dto.priority)) {
      throw new BadRequestException('올바르지 않은 priority 값입니다')
    }

    return this.dataSource.transaction(async (em) => {
      const task = await em.findOne(Task, { where: { id } })
      if (!task) throw new NotFoundException('작업을 찾을 수 없습니다')

      if (dto.status === 'done' && task.status !== 'done') {
        task.completedAt = new Date()
      } else if (dto.status && dto.status !== 'done') {
        task.completedAt = null
      }

      if (dto.title !== undefined) task.title = dto.title.trim()
      if (dto.description !== undefined) task.description = dto.description ?? null
      if (dto.assignee !== undefined) task.assignee = dto.assignee ?? null
      if (dto.assigneeId !== undefined) task.assigneeId = dto.assigneeId ?? null
      if (dto.startDate !== undefined) task.startDate = dto.startDate ?? null
      if (dto.dueDate !== undefined) task.dueDate = dto.dueDate ?? null
      if (dto.status !== undefined) task.status = dto.status
      if (dto.priority !== undefined) task.priority = dto.priority
      if (dto.parentTaskId !== undefined) task.parentTaskId = dto.parentTaskId ?? null
      if (dto.tags !== undefined) task.tags = dto.tags ?? null
      if (dto.sortOrder !== undefined) task.sortOrder = dto.sortOrder

      const saved = await em.save(Task, task)

      if (dto.assigneeIds !== undefined) {
        await em.delete(TaskAssignee, { taskId: id })
        if (dto.assigneeIds.length > 0) {
          const assignees = dto.assigneeIds.map((userId) =>
            em.create(TaskAssignee, { taskId: id, userId }),
          )
          await em.save(TaskAssignee, assignees)
        }
      }

      return saved
    })
  }

  // ── 상태 단독 변경 (칸반 드래그) ────────────────────────────────────────────

  async updateStatus(id: string, status: TaskStatus): Promise<Task> {
    assertUuid(id, 'taskId')
    if (!ALLOWED_STATUS.has(status)) {
      throw new BadRequestException('올바르지 않은 status 값입니다')
    }

    const task = await this.taskRepo.findOne({ where: { id } })
    if (!task) throw new NotFoundException('작업을 찾을 수 없습니다')

    if (status === 'done' && task.status !== 'done') {
      task.completedAt = new Date()
    } else if (status !== 'done') {
      task.completedAt = null
    }

    task.status = status
    return this.taskRepo.save(task)
  }

  // ── 작업 삭제 ────────────────────────────────────────────────────────────────

  async remove(id: string): Promise<void> {
    assertUuid(id, 'taskId')
    const result = await this.taskRepo.delete(id)
    if (result.affected === 0) throw new NotFoundException('작업을 찾을 수 없습니다')
  }

  // ── 커스텀 필드 정의 ─────────────────────────────────────────────────────────

  async getCustomFieldDefs(projectId: string): Promise<CustomFieldDefinition[]> {
    assertUuid(projectId, 'projectId')
    return this.fieldDefRepo.find({
      where: { projectId },
      order: { createdAt: 'ASC' },
    })
  }

  async createCustomFieldDef(
    projectId: string,
    dto: { name: string; type: CustomFieldType; options?: Record<string, unknown>[] },
  ): Promise<CustomFieldDefinition> {
    assertUuid(projectId, 'projectId')
    const def = this.fieldDefRepo.create({
      projectId,
      name: dto.name,
      type: dto.type,
      options: dto.options ?? null,
    })
    return this.fieldDefRepo.save(def)
  }

  // ── 커스텀 필드 값 저장 (Upsert) ────────────────────────────────────────────

  async upsertCustomFieldValues(
    taskId: string,
    values: Array<{ fieldId: string; value: unknown }>,
  ): Promise<CustomFieldValue[]> {
    assertUuid(taskId, 'taskId')
    if (!values.length) return []

    const results: CustomFieldValue[] = []
    for (const { fieldId, value } of values) {
      assertUuid(fieldId, 'fieldId')
      const existing = await this.fieldValueRepo.findOne({ where: { taskId, fieldId } })
      if (existing) {
        existing.value = value
        results.push(await this.fieldValueRepo.save(existing))
      } else {
        const created = this.fieldValueRepo.create({ taskId, fieldId, value })
        results.push(await this.fieldValueRepo.save(created))
      }
    }
    return results
  }

  // ── 단일 조회 (레거시 호환) ──────────────────────────────────────────────────

  async getOne(id: string): Promise<Task> {
    assertUuid(id, 'taskId')
    const task = await this.taskRepo.findOne({ where: { id } })
    if (!task) throw new NotFoundException('작업을 찾을 수 없습니다')
    return task
  }

  // ── 칸반 뷰 ─────────────────────────────────────────────────────────────────

  async kanban(query: {
    groupId?: string
    projectId?: string
  }): Promise<Record<TaskStatus, Task[]>> {
    const qb = this.taskRepo
      .createQueryBuilder('t')
      .leftJoinAndSelect('t.assignees', 'ta')
      .orderBy('t.sortOrder', 'ASC')
      .addOrderBy('t.createdAt', 'ASC')

    if (query.groupId) {
      assertUuid(query.groupId, 'groupId')
      qb.andWhere('t.groupId = :groupId', { groupId: query.groupId })
    }
    if (query.projectId) {
      assertUuid(query.projectId, 'projectId')
      qb.andWhere('t.projectId = :projectId', { projectId: query.projectId })
    }

    const tasks = await qb.getMany()
    const columns: Record<TaskStatus, Task[]> = { todo: [], 'in-progress': [], done: [] }
    for (const task of tasks) {
      columns[task.status]?.push(task)
    }
    return columns
  }

  // ── 마감 임박 작업 ───────────────────────────────────────────────────────────

  async upcoming(userId: string, days = 3): Promise<Task[]> {
    assertUuid(userId, 'userId')

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const limitDate = new Date(today)
    limitDate.setDate(limitDate.getDate() + days)

    return this.taskRepo
      .createQueryBuilder('t')
      .where('(t.assigneeId = :uid OR t.createdBy = :uid)', { uid: userId })
      .andWhere('t.status != :done', { done: 'done' })
      .andWhere('t.dueDate BETWEEN :today AND :limit', {
        today: today.toISOString().slice(0, 10),
        limit: limitDate.toISOString().slice(0, 10),
      })
      .orderBy('t.dueDate', 'ASC')
      .getMany()
  }

  // ── 통계 ─────────────────────────────────────────────────────────────────────

  async stats(query: { groupId?: string; projectId?: string; userId?: string }) {
    const qb = this.taskRepo.createQueryBuilder('t')

    if (query.groupId) {
      assertUuid(query.groupId, 'groupId')
      qb.andWhere('t.groupId = :groupId', { groupId: query.groupId })
    }
    if (query.projectId) {
      assertUuid(query.projectId, 'projectId')
      qb.andWhere('t.projectId = :projectId', { projectId: query.projectId })
    }
    if (query.userId) {
      assertUuid(query.userId, 'userId')
      qb.andWhere('(t.assigneeId = :uid OR t.createdBy = :uid)', { uid: query.userId })
    }

    const tasks = await qb.getMany()
    const today = new Date().toISOString().slice(0, 10)
    return {
      total: tasks.length,
      todo: tasks.filter((t) => t.status === 'todo').length,
      inProgress: tasks.filter((t) => t.status === 'in-progress').length,
      done: tasks.filter((t) => t.status === 'done').length,
      overdue: tasks.filter((t) => t.status !== 'done' && t.dueDate && t.dueDate < today).length,
    }
  }

  // ── 일괄 상태 변경 ───────────────────────────────────────────────────────────

  async bulkUpdateStatus(dto: BulkUpdateStatusDto): Promise<Task[]> {
    if (!ALLOWED_STATUS.has(dto.status)) {
      throw new BadRequestException('올바르지 않은 status 값입니다')
    }
    if (!dto.ids.length) return []

    const completedAt = dto.status === 'done' ? new Date() : null
    await this.taskRepo.update({ id: In(dto.ids) }, { status: dto.status, completedAt })
    return this.taskRepo.findBy({ id: In(dto.ids) })
  }

  // ── 정렬 순서 변경 ───────────────────────────────────────────────────────────

  async reorder(dto: ReorderTasksDto): Promise<void> {
    if (!dto.orders.length) return
    const updates = dto.orders.map(({ id, sortOrder }) => {
      assertUuid(id, 'taskId')
      return this.taskRepo.update(id, { sortOrder })
    })
    await Promise.all(updates)
  }
}
