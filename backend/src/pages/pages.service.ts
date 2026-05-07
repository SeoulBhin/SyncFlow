import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Page } from './entities/page.entity'
import { PageVersion } from './entities/page-version.entity'
import { Project } from '../projects/entities/project.entity'
import { GroupMember } from '../groups/entities/group-member.entity'
import { CreatePageDto } from './dto/create-page.dto'
import { UpdatePageDto, UpdatePageTitleDto } from './dto/update-page.dto'

@Injectable()
export class PagesService {
  constructor(
    @InjectRepository(Page)
    private readonly pageRepo: Repository<Page>,
    @InjectRepository(PageVersion)
    private readonly versionRepo: Repository<PageVersion>,
    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,
    @InjectRepository(GroupMember)
    private readonly groupMemberRepo: Repository<GroupMember>,
  ) {}

  /* ── POST /api/pages ── */
  async createPage(userId: string, dto: CreatePageDto) {
    const project = await this.findProjectOrThrow(dto.projectId)
    await this.requireGroupMember(project.groupId, userId)

    const page = this.pageRepo.create({
      projectId: dto.projectId,
      title: dto.title,
      type: dto.type,
      content: dto.content ?? null,
      language: dto.language ?? null,
      sortOrder: dto.sortOrder ?? 0,
      createdBy: userId,
    })
    await this.pageRepo.save(page)

    // 초기 버전 저장
    if (dto.content) {
      await this.saveVersion(page.id, dto.content, userId)
    }

    return page
  }

  /* ── GET /api/projects/:id/pages ── */
  async getProjectPages(projectId: string, userId: string) {
    const project = await this.findProjectOrThrow(projectId)
    await this.requireGroupMember(project.groupId, userId)

    return this.pageRepo.find({
      where: { projectId },
      order: { sortOrder: 'ASC', createdAt: 'ASC' },
      select: ['id', 'projectId', 'title', 'type', 'language', 'sortOrder', 'createdBy', 'createdAt', 'updatedAt'],
    })
  }

  /* ── GET /api/pages/:id ── */
  async getPage(pageId: string, userId: string) {
    const page = await this.pageRepo.findOne({
      where: { id: pageId },
      relations: ['creator'],
    })
    if (!page) throw new NotFoundException('페이지를 찾을 수 없습니다')

    const project = await this.findProjectOrThrow(page.projectId)
    await this.requireGroupMember(project.groupId, userId)

    return page
  }

  /* ── PUT /api/pages/:id ── */
  async updatePage(pageId: string, userId: string, dto: UpdatePageDto) {
    const page = await this.findPageOrThrow(pageId)
    const project = await this.findProjectOrThrow(page.projectId)
    await this.requireGroupMember(project.groupId, userId)

    if (dto.content !== undefined) {
      page.content = dto.content ?? null
      await this.saveVersion(pageId, dto.content ?? {}, userId)
    }
    if (dto.title !== undefined) page.title = dto.title
    if (dto.language !== undefined) page.language = dto.language ?? null
    if (dto.sortOrder !== undefined) page.sortOrder = dto.sortOrder

    return this.pageRepo.save(page)
  }

  /* ── PUT /api/pages/:id/title ── */
  async updatePageTitle(pageId: string, userId: string, dto: UpdatePageTitleDto) {
    const page = await this.findPageOrThrow(pageId)
    const project = await this.findProjectOrThrow(page.projectId)
    await this.requireGroupMember(project.groupId, userId)

    page.title = dto.title
    return this.pageRepo.save(page)
  }

  /* ── DELETE /api/pages/:id ── */
  async deletePage(pageId: string, userId: string) {
    const page = await this.findPageOrThrow(pageId)
    const project = await this.findProjectOrThrow(page.projectId)
    await this.requireGroupMember(project.groupId, userId)

    await this.pageRepo.delete(pageId)
    return { message: '페이지가 삭제되었습니다' }
  }

  /* ── 내부 헬퍼 ── */
  private async findPageOrThrow(pageId: string): Promise<Page> {
    const page = await this.pageRepo.findOne({ where: { id: pageId } })
    if (!page) throw new NotFoundException('페이지를 찾을 수 없습니다')
    return page
  }

  private async findProjectOrThrow(projectId: string): Promise<Project> {
    const project = await this.projectRepo.findOne({ where: { id: projectId } })
    if (!project) throw new NotFoundException('프로젝트를 찾을 수 없습니다')
    return project
  }

  private async requireGroupMember(groupId: string, userId: string): Promise<GroupMember> {
    const member = await this.groupMemberRepo.findOne({ where: { groupId, userId } })
    if (!member) throw new ForbiddenException('접근 권한이 없습니다')
    return member
  }

  private async saveVersion(
    pageId: string,
    content: Record<string, unknown>,
    userId: string,
  ): Promise<PageVersion> {
    const version = this.versionRepo.create({
      pageId,
      content,
      createdBy: userId,
    })
    return this.versionRepo.save(version)
  }
}
