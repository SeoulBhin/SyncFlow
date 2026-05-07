import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Task } from './entities/task.entity'

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const ALLOWED_STATUS = new Set(['todo', 'in-progress', 'done'])

function assertUuid(v: string, label = 'id'): void {
  if (!UUID_RE.test(v)) {
    throw new BadRequestException(`${label}가 유효한 UUID 형식이 아닙니다: ${v}`)
  }
}

interface UpdateTaskDto {
  title?: string
  assignee?: string | null
  dueDate?: string | null
  status?: string
}

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name)

  constructor(@InjectRepository(Task) private readonly taskRepo: Repository<Task>) {}

  // 전체 Task 목록 — 최신순. (Phase 2: assignee/userId 필터 추가 예정)
  async listAll(): Promise<Task[]> {
    return this.taskRepo.find({ order: { createdAt: 'DESC' } })
  }

  async getOne(id: string): Promise<Task> {
    assertUuid(id, 'taskId')
    const task = await this.taskRepo.findOne({ where: { id } })
    if (!task) throw new NotFoundException('작업을 찾을 수 없습니다')
    return task
  }

  async create(data: { title: string; assignee?: string | null; dueDate?: string | null; status?: string }): Promise<Task> {
    if (!data.title?.trim()) {
      throw new BadRequestException('title은 필수입니다')
    }
    const status = data.status && ALLOWED_STATUS.has(data.status) ? data.status : 'todo'
    const task = this.taskRepo.create({
      title: data.title.trim(),
      assignee: data.assignee ?? null,
      dueDate: data.dueDate ?? null,
      status,
    })
    return this.taskRepo.save(task)
  }

  async update(id: string, data: UpdateTaskDto): Promise<Task> {
    assertUuid(id, 'taskId')
    if (data.status && !ALLOWED_STATUS.has(data.status)) {
      throw new BadRequestException(`status는 ${[...ALLOWED_STATUS].join(' | ')} 중 하나여야 합니다`)
    }
    const existing = await this.taskRepo.findOne({ where: { id } })
    if (!existing) throw new NotFoundException('작업을 찾을 수 없습니다')

    Object.assign(existing, {
      ...(data.title !== undefined ? { title: data.title } : {}),
      ...(data.assignee !== undefined ? { assignee: data.assignee } : {}),
      ...(data.dueDate !== undefined ? { dueDate: data.dueDate } : {}),
      ...(data.status !== undefined ? { status: data.status } : {}),
    })
    return this.taskRepo.save(existing)
  }

  async remove(id: string): Promise<void> {
    assertUuid(id, 'taskId')
    const result = await this.taskRepo.delete(id)
    if (result.affected === 0) {
      throw new NotFoundException('작업을 찾을 수 없습니다')
    }
  }
}
