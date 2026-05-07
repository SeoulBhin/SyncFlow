import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { GroupMember } from '../entities/group-member.entity'
import { Group } from '../entities/group.entity'

export const GROUP_ROLES_KEY = 'groupRoles'

/**
 * 사용 예시:
 * @SetMetadata(GROUP_ROLES_KEY, ['owner', 'admin'])
 * @UseGuards(JwtAuthGuard, GroupMemberGuard)
 *
 * Route param 이름: :id (그룹 ID) 또는 :groupId
 */
@Injectable()
export class GroupMemberGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @InjectRepository(Group)
    private readonly groupRepo: Repository<Group>,
    @InjectRepository(GroupMember)
    private readonly memberRepo: Repository<GroupMember>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{ user: { id: string }; params: Record<string, string> }>()
    const user = request.user
    const groupId = request.params.id ?? request.params.groupId

    if (!groupId) return true

    const group = await this.groupRepo.findOne({ where: { id: groupId } })
    if (!group) throw new NotFoundException('그룹을 찾을 수 없습니다')

    const member = await this.memberRepo.findOne({
      where: { groupId, userId: user.id },
    })

    // 필요한 역할이 명시된 경우 멤버 + 역할 체크
    const requiredRoles = this.reflector.get<string[]>(GROUP_ROLES_KEY, context.getHandler())

    if (requiredRoles && requiredRoles.length > 0) {
      if (!member || !requiredRoles.includes(member.role)) {
        throw new ForbiddenException('권한이 없습니다')
      }
      return true
    }

    // 역할 명시 없음 → public 그룹은 누구나, private는 멤버만
    if (group.visibility === 'public') return true
    if (!member) throw new ForbiddenException('비공개 그룹에 접근할 권한이 없습니다')
    return true
  }
}
