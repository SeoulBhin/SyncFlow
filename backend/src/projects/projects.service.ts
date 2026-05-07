import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Project } from './entities/project.entity'
import { ProjectMember } from './entities/project-member.entity'
import { GroupMember } from '../groups/entities/group-member.entity'
import { CreateProjectDto } from './dto/create-project.dto'
import { UpdateProjectDto } from './dto/update-project.dto'

@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,
    @InjectRepository(ProjectMember)
    private readonly projectMemberRepo: Repository<ProjectMember>,
    @InjectRepository(GroupMember)
    private readonly groupMemberRepo: Repository<GroupMember>,
  ) {}

  /* ── POST /api/projects ── */
  async createProject(userId: string, dto: CreateProjectDto) {
    // 그룹 멤버인지 확인
    const groupMember = await this.groupMemberRepo.findOne({
      where: { groupId: dto.groupId, userId },
    })
    if (!groupMember) {
      throw new ForbiddenException('그룹 멤버만 프로젝트를 생성할 수 있습니다')
    }

    const project = this.projectRepo.create({
      groupId: dto.groupId,
      name: dto.name,
      description: dto.description ?? null,
      deadline: dto.deadline ?? null,
      sortOrder: dto.sortOrder ?? 0,
    })
    await this.projectRepo.save(project)

    // 생성자를 admin으로 등록
    const member = this.projectMemberRepo.create({
      projectId: project.id,
      userId,
      role: 'admin',
    })
    await this.projectMemberRepo.save(member)

    return project
  }

  /* ── GET /api/groups/:id/projects ── */
  async getGroupProjects(groupId: string, userId: string) {
    // 그룹 멤버 여부 확인
    const groupMember = await this.groupMemberRepo.findOne({
      where: { groupId, userId },
    })
    if (!groupMember) {
      throw new ForbiddenException('그룹 멤버만 프로젝트 목록을 조회할 수 있습니다')
    }

    return this.projectRepo.find({
      where: { groupId },
      order: { sortOrder: 'ASC', createdAt: 'ASC' },
    })
  }

  /* ── GET /api/projects/:id ── */
  async getProject(projectId: string, userId: string) {
    const project = await this.projectRepo.findOne({
      where: { id: projectId },
      relations: ['members', 'members.user'],
    })
    if (!project) throw new NotFoundException('프로젝트를 찾을 수 없습니다')

    // 그룹 멤버인지 확인
    const groupMember = await this.groupMemberRepo.findOne({
      where: { groupId: project.groupId, userId },
    })
    if (!groupMember) throw new ForbiddenException('접근 권한이 없습니다')

    const myProjectMember = project.members.find((m) => m.userId === userId)
    return { ...project, myRole: myProjectMember?.role ?? null }
  }

  /* ── PUT /api/projects/:id ── */
  async updateProject(projectId: string, userId: string, dto: UpdateProjectDto) {
    const project = await this.findProjectOrThrow(projectId)
    await this.requireGroupMember(project.groupId, userId, ['owner', 'admin'])

    if (dto.name !== undefined) project.name = dto.name
    if (dto.description !== undefined) project.description = dto.description ?? null
    if (dto.deadline !== undefined) project.deadline = dto.deadline ?? null
    if (dto.sortOrder !== undefined) project.sortOrder = dto.sortOrder

    return this.projectRepo.save(project)
  }

  /* ── DELETE /api/projects/:id ── */
  async deleteProject(projectId: string, userId: string) {
    const project = await this.findProjectOrThrow(projectId)
    await this.requireGroupMember(project.groupId, userId, ['owner', 'admin'])
    await this.projectRepo.delete(projectId)
    return { message: '프로젝트가 삭제되었습니다' }
  }

  /* ── 내부 헬퍼 ── */
  private async findProjectOrThrow(projectId: string): Promise<Project> {
    const project = await this.projectRepo.findOne({ where: { id: projectId } })
    if (!project) throw new NotFoundException('프로젝트를 찾을 수 없습니다')
    return project
  }

  private async requireGroupMember(
    groupId: string,
    userId: string,
    roles: string[],
  ): Promise<GroupMember> {
    const member = await this.groupMemberRepo.findOne({ where: { groupId, userId } })
    if (!member || !roles.includes(member.role)) {
      throw new ForbiddenException('권한이 없습니다')
    }
    return member
  }
}
