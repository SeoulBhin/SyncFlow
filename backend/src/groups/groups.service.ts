import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, ILike } from 'typeorm'
import * as crypto from 'crypto'
import { Group } from './entities/group.entity'
import { GroupMember } from './entities/group-member.entity'
import { InviteCode } from './entities/invite-code.entity'
import { CreateGroupDto } from './dto/create-group.dto'
import { UpdateGroupDto } from './dto/update-group.dto'
import { JoinGroupDto } from './dto/join-group.dto'

@Injectable()
export class GroupsService {
  constructor(
    @InjectRepository(Group)
    private readonly groupRepo: Repository<Group>,
    @InjectRepository(GroupMember)
    private readonly memberRepo: Repository<GroupMember>,
    @InjectRepository(InviteCode)
    private readonly inviteCodeRepo: Repository<InviteCode>,
  ) {}

  /* ── POST /api/groups ── */
  async createGroup(userId: string, dto: CreateGroupDto) {
    const group = this.groupRepo.create({
      name: dto.name,
      description: dto.description ?? null,
      visibility: dto.visibility ?? 'public',
      isExternal: dto.isExternal ?? false,
      connectedOrgIds: dto.connectedOrgIds ?? [],
      createdBy: userId,
    })
    await this.groupRepo.save(group)

    // 생성자를 owner로 등록
    const member = this.memberRepo.create({
      groupId: group.id,
      userId,
      role: 'owner',
    })
    await this.memberRepo.save(member)

    // 초대 코드 자동 발급
    const inviteCode = await this.generateInviteCode(group.id)

    return { ...group, inviteCode: inviteCode.code }
  }

  /* ── GET /api/groups ── */
  async getMyGroups(userId: string) {
    const memberships = await this.memberRepo.find({
      where: { userId },
      relations: ['group'],
    })
    return memberships.map((m) => ({
      ...m.group,
      myRole: m.role,
    }))
  }

  /* ── GET /api/groups/search?q= ── */
  async searchGroups(q: string) {
    return this.groupRepo.find({
      where: [
        { visibility: 'public', name: ILike(`%${q}%`) },
      ],
      order: { createdAt: 'DESC' },
      take: 20,
    })
  }

  /* ── GET /api/groups/:id ── */
  async getGroup(groupId: string, userId: string) {
    const group = await this.groupRepo.findOne({
      where: { id: groupId },
      relations: ['members', 'members.user'],
    })
    if (!group) throw new NotFoundException('그룹을 찾을 수 없습니다')

    const member = group.members.find((m) => m.userId === userId)

    if (group.visibility === 'private' && !member) {
      throw new ForbiddenException('비공개 그룹에 접근할 권한이 없습니다')
    }

    // 초대 코드 (멤버에게만 제공)
    let inviteCode: string | null = null
    if (member) {
      const code = await this.inviteCodeRepo.findOne({
        where: { groupId, isActive: true },
        order: { createdAt: 'DESC' },
      })
      inviteCode = code?.code ?? null
    }

    return { ...group, myRole: member?.role ?? null, inviteCode }
  }

  /* ── PUT /api/groups/:id ── */
  async updateGroup(groupId: string, userId: string, dto: UpdateGroupDto) {
    const group = await this.findGroupOrThrow(groupId)
    await this.requireRole(groupId, userId, ['owner', 'admin'])

    if (dto.name !== undefined) group.name = dto.name
    if (dto.description !== undefined) group.description = dto.description ?? null
    if (dto.visibility !== undefined) group.visibility = dto.visibility
    if (dto.isExternal !== undefined) group.isExternal = dto.isExternal
    if (dto.connectedOrgIds !== undefined) group.connectedOrgIds = dto.connectedOrgIds ?? []

    return this.groupRepo.save(group)
  }

  /* ── DELETE /api/groups/:id ── */
  async deleteGroup(groupId: string, userId: string) {
    await this.findGroupOrThrow(groupId)
    await this.requireRole(groupId, userId, ['owner'])
    await this.groupRepo.delete(groupId)
    return { message: '그룹이 삭제되었습니다' }
  }

  /* ── POST /api/groups/:id/regenerate-code ── */
  async regenerateInviteCode(groupId: string, userId: string) {
    await this.findGroupOrThrow(groupId)
    await this.requireRole(groupId, userId, ['owner', 'admin'])

    // 기존 코드 비활성화
    await this.inviteCodeRepo.update({ groupId, isActive: true }, { isActive: false })

    const inviteCode = await this.generateInviteCode(groupId)
    return { code: inviteCode.code }
  }

  /* ── POST /api/groups/join ── */
  async joinGroup(userId: string, dto: JoinGroupDto) {
    const inviteCode = await this.inviteCodeRepo.findOne({
      where: { code: dto.code, isActive: true },
      relations: ['group'],
    })

    if (!inviteCode) throw new BadRequestException('유효하지 않은 초대 코드입니다')

    if (inviteCode.expiresAt && inviteCode.expiresAt < new Date()) {
      throw new BadRequestException('만료된 초대 코드입니다')
    }

    const existing = await this.memberRepo.findOne({
      where: { groupId: inviteCode.groupId, userId },
    })
    if (existing) throw new BadRequestException('이미 그룹에 참여 중입니다')

    const member = this.memberRepo.create({
      groupId: inviteCode.groupId,
      userId,
      role: 'member',
    })
    await this.memberRepo.save(member)

    return { message: '그룹에 참여했습니다', group: inviteCode.group }
  }

  /* ── GET /api/groups/:id/members ── */
  async getMembers(groupId: string, userId: string) {
    const group = await this.findGroupOrThrow(groupId)
    const requester = await this.memberRepo.findOne({ where: { groupId, userId } })

    if (group.visibility === 'private' && !requester) {
      throw new ForbiddenException('권한이 없습니다')
    }

    return this.memberRepo.find({
      where: { groupId },
      relations: ['user'],
      order: { joinedAt: 'ASC' },
    })
  }

  /* ── PUT /api/groups/:id/members/:uid ── */
  async updateMemberRole(
    groupId: string,
    requesterId: string,
    targetUserId: string,
    role: 'owner' | 'admin' | 'member' | 'guest',
  ) {
    await this.requireRole(groupId, requesterId, ['owner', 'admin'])

    const targetMember = await this.memberRepo.findOne({
      where: { groupId, userId: targetUserId },
    })
    if (!targetMember) throw new NotFoundException('멤버를 찾을 수 없습니다')

    // owner 역할은 owner만 부여 가능
    if (role === 'owner') {
      await this.requireRole(groupId, requesterId, ['owner'])
    }

    targetMember.role = role
    return this.memberRepo.save(targetMember)
  }

  /* ── DELETE /api/groups/:id/members/:uid ── */
  async removeMember(groupId: string, requesterId: string, targetUserId: string) {
    await this.requireRole(groupId, requesterId, ['owner', 'admin'])

    const targetMember = await this.memberRepo.findOne({
      where: { groupId, userId: targetUserId },
    })
    if (!targetMember) throw new NotFoundException('멤버를 찾을 수 없습니다')

    // owner는 강퇴 불가
    if (targetMember.role === 'owner') {
      throw new ForbiddenException('그룹 소유자는 강퇴할 수 없습니다')
    }

    await this.memberRepo.remove(targetMember)
    return { message: '멤버가 제거되었습니다' }
  }

  /* ── 내부 헬퍼 ── */
  private async findGroupOrThrow(groupId: string): Promise<Group> {
    const group = await this.groupRepo.findOne({ where: { id: groupId } })
    if (!group) throw new NotFoundException('그룹을 찾을 수 없습니다')
    return group
  }

  private async requireRole(
    groupId: string,
    userId: string,
    roles: string[],
  ): Promise<GroupMember> {
    const member = await this.memberRepo.findOne({ where: { groupId, userId } })
    if (!member || !roles.includes(member.role)) {
      throw new ForbiddenException('권한이 없습니다')
    }
    return member
  }

  private async generateInviteCode(groupId: string): Promise<InviteCode> {
    let code: string
    let exists: boolean

    do {
      code = crypto.randomBytes(6).toString('base64url').slice(0, 8).toUpperCase()
      const found = await this.inviteCodeRepo.findOne({ where: { code } })
      exists = !!found
    } while (exists)

    const inviteCode = this.inviteCodeRepo.create({
      groupId,
      code,
      isActive: true,
    })
    return this.inviteCodeRepo.save(inviteCode)
  }
}
