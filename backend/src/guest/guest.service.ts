import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { In, Repository } from 'typeorm'
import * as crypto from 'crypto'
import { ConfigService } from '@nestjs/config'
import { MeetingGuestInvite } from './entities/meeting-guest-invite.entity'
import { Meeting } from '../meetings/entities/meeting.entity'
import { Page } from '../pages/entities/page.entity'
import { Project } from '../projects/entities/project.entity'
import { LiveKitService } from '../livekit/livekit.service'

@Injectable()
export class GuestService {
  constructor(
    @InjectRepository(MeetingGuestInvite)
    private inviteRepo: Repository<MeetingGuestInvite>,
    @InjectRepository(Meeting)
    private meetingRepo: Repository<Meeting>,
    @InjectRepository(Page)
    private pageRepo: Repository<Page>,
    @InjectRepository(Project)
    private projectRepo: Repository<Project>,
    private livekitService: LiveKitService,
    private config: ConfigService,
  ) {}

  /** 게스트 초대 링크 생성 — 호스트 전용 (JWT 보호 엔드포인트에서 호출) */
  async createGuestInvite(meetingId: string, userId: string) {
    const meeting = await this.meetingRepo.findOne({ where: { id: meetingId } })
    if (!meeting) throw new NotFoundException('회의를 찾을 수 없습니다')
    if (meeting.status === 'ended')
      throw new BadRequestException('종료된 회의에는 초대를 생성할 수 없습니다')
    if (meeting.hostId !== userId)
      throw new ForbiddenException('회의 호스트만 게스트 초대 링크를 생성할 수 있습니다')

    const token = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24시간

    const invite = this.inviteRepo.create({ token, meetingId, createdBy: userId, expiresAt })
    await this.inviteRepo.save(invite)

    const frontendUrl = this.config.get<string>('FRONTEND_URL', 'http://localhost:5174')
    return {
      token,
      url: `${frontendUrl}/guest/meetings/${token}`,
    }
  }

  /** 초대 토큰 유효성 검증 — 공개 API */
  async getInviteInfo(token: string) {
    const invite = await this.inviteRepo.findOne({ where: { token } })
    if (!invite) throw new NotFoundException('유효하지 않은 링크입니다')
    if (invite.isRevoked) throw new BadRequestException('취소된 초대 링크입니다')
    if (invite.expiresAt < new Date()) throw new BadRequestException('만료된 초대 링크입니다')
    if (invite.maxUses !== null && invite.useCount >= invite.maxUses)
      throw new BadRequestException('초대 사용 횟수가 초과되었습니다')

    const meeting = await this.meetingRepo.findOne({ where: { id: invite.meetingId } })
    if (!meeting) throw new NotFoundException('회의를 찾을 수 없습니다')
    if (meeting.status === 'ended') throw new BadRequestException('종료된 회의입니다')

    return {
      meetingId: meeting.id,
      title: meeting.title,
      status: meeting.status,
      expiresAt: invite.expiresAt,
    }
  }

  /** 게스트로 회의 입장 — 이름 검증 + 토큰 재검증 + LiveKit 토큰 발급 */
  async joinAsGuest(token: string, guestName: string) {
    const trimmed = (guestName ?? '').trim()
    if (!trimmed) throw new BadRequestException('이름을 입력해주세요')
    if (trimmed.length > 50) throw new BadRequestException('이름은 50자 이하여야 합니다')

    const invite = await this.inviteRepo.findOne({ where: { token } })
    if (!invite) throw new NotFoundException('유효하지 않은 링크입니다')
    if (invite.isRevoked) throw new BadRequestException('취소된 초대 링크입니다')
    if (invite.expiresAt < new Date()) throw new BadRequestException('만료된 초대 링크입니다')
    if (invite.maxUses !== null && invite.useCount >= invite.maxUses)
      throw new BadRequestException('초대 사용 횟수가 초과되었습니다')

    const meeting = await this.meetingRepo.findOne({ where: { id: invite.meetingId } })
    if (!meeting) throw new NotFoundException('회의를 찾을 수 없습니다')
    if (meeting.status === 'ended') throw new BadRequestException('종료된 회의입니다')

    invite.useCount += 1
    await this.inviteRepo.save(invite)

    // 게스트 identity: "guest-{tokenPrefix}-{randomId}" 형식
    // — 내부 사용자 UUID와 충돌 없이 게스트임을 식별 가능
    const guestId = crypto.randomBytes(8).toString('hex')
    const identity = `guest-${token.slice(0, 8)}-${guestId}`
    const roomName = `voice-${meeting.id}`

    const { token: livekitToken, url: livekitUrl } =
      await this.livekitService.generateGuestToken(roomName, trimmed, identity)

    return {
      meetingId: meeting.id,
      roomName,
      participantName: trimmed,
      identity,
      livekitUrl,
      token: livekitToken,
    }
  }

  /**
   * 게스트 협업 자료 목록 — 회의의 projectId에 속한 pages를 읽기 전용으로 반환.
   * 게스트는 내용 편집/업로드/삭제 불가. 목록 열람만 허용.
   */
  async getMeetingMaterials(token: string) {
    const invite = await this.inviteRepo.findOne({ where: { token } })
    if (!invite) throw new NotFoundException('유효하지 않은 링크입니다')
    if (invite.isRevoked) throw new BadRequestException('취소된 초대 링크입니다')
    if (invite.expiresAt < new Date()) throw new BadRequestException('만료된 초대 링크입니다')

    const meeting = await this.meetingRepo.findOne({ where: { id: invite.meetingId } })
    if (!meeting) throw new NotFoundException('회의를 찾을 수 없습니다')
    if (meeting.status === 'ended') throw new BadRequestException('종료된 회의입니다')

    // projectId가 설정된 경우 → 해당 프로젝트 pages만 반환
    if (meeting.projectId) {
      return this.pageRepo.find({
        where: { projectId: meeting.projectId },
        order: { sortOrder: 'ASC', createdAt: 'ASC' },
        select: ['id', 'title', 'type', 'language', 'updatedAt'],
      })
    }

    // projectId 없이 groupId만 있는 경우 → 그룹 소속 모든 프로젝트의 pages 반환
    if (!meeting.groupId) return []
    const projects = await this.projectRepo.find({
      where: { groupId: meeting.groupId },
      select: ['id'],
    })
    if (projects.length === 0) return []
    const projectIds = projects.map((p) => p.id)
    return this.pageRepo.find({
      where: { projectId: In(projectIds) },
      order: { sortOrder: 'ASC', createdAt: 'ASC' },
      select: ['id', 'title', 'type', 'language', 'updatedAt'],
    })
  }

  /**
   * 게스트 협업 자료 상세 조회 — token 검증 + page가 해당 회의 projectId에 속하는지 확인.
   * content(TipTap JSON 또는 코드 문자열)만 반환. 작성자/권한 정보 미포함.
   */
  async getMaterialDetail(token: string, pageId: string) {
    const invite = await this.inviteRepo.findOne({ where: { token } })
    if (!invite) throw new NotFoundException('유효하지 않은 링크입니다')
    if (invite.isRevoked) throw new BadRequestException('취소된 초대 링크입니다')
    if (invite.expiresAt < new Date()) throw new BadRequestException('만료된 초대 링크입니다')

    const meeting = await this.meetingRepo.findOne({ where: { id: invite.meetingId } })
    if (!meeting) throw new NotFoundException('회의를 찾을 수 없습니다')
    if (meeting.status === 'ended') throw new BadRequestException('종료된 회의입니다')

    let page: Page | null = null

    if (meeting.projectId) {
      // 특정 프로젝트 소속 검증 — 다른 프로젝트의 pageId 직접 요청 차단
      page = await this.pageRepo.findOne({ where: { id: pageId, projectId: meeting.projectId } })
    } else if (meeting.groupId) {
      // groupId fallback — 그룹 소속 프로젝트의 page인지 검증
      const projects = await this.projectRepo.find({
        where: { groupId: meeting.groupId },
        select: ['id'],
      })
      const projectIds = projects.map((p) => p.id)
      if (projectIds.length > 0) {
        page = await this.pageRepo.findOne({ where: { id: pageId, projectId: In(projectIds) } })
      }
    } else {
      throw new NotFoundException('이 회의에는 협업 자료가 없습니다')
    }

    if (!page) throw new ForbiddenException('접근할 수 없는 자료입니다')

    return {
      id: page.id,
      title: page.title,
      type: page.type,
      language: page.language,
      content: page.content,
      updatedAt: page.updatedAt,
    }
  }
}
