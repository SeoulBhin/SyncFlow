import {
  Controller,
  Post,
  Put,
  Delete,
  Get,
  Param,
  Body,
  Query,
  UseGuards,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
  HttpCode,
  ParseUUIDPipe,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { diskStorage } from 'multer'
import * as path from 'path'
import * as fs from 'fs'
import { MeetingsService } from './meetings.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import {
  CurrentUser,
  type CurrentUserPayload,
} from '../auth/decorators/current-user.decorator'

// 오디오 저장 경로: MEETING_AUDIO_DIR env가 있으면 사용 (절대/상대 모두 허용)
// 미설정 시 기본값 = <cwd>/uploads/audio
const AUDIO_UPLOAD_DIR = (() => {
  const configured = process.env.MEETING_AUDIO_DIR?.trim()
  if (configured) {
    return path.isAbsolute(configured)
      ? configured
      : path.resolve(process.cwd(), configured)
  }
  return path.join(process.cwd(), 'uploads', 'audio')
})()

if (!fs.existsSync(AUDIO_UPLOAD_DIR)) {
  fs.mkdirSync(AUDIO_UPLOAD_DIR, { recursive: true })
}

const AUDIO_MAX_BYTES =
  (Number(process.env.MEETING_AUDIO_MAX_MB) || 50) * 1024 * 1024

const ALLOWED_AUDIO_MIME = new Set([
  'audio/webm',
  'audio/wav',
  'audio/x-wav',
  'audio/wave',
  'audio/ogg',
  'audio/flac',
  'audio/mpeg',
  'audio/mp3',
  'audio/mp4',
])

@Controller('meetings')
@UseGuards(JwtAuthGuard)
export class MeetingsController {
  constructor(private meetingsService: MeetingsService) {}

  // 회의 방 생성 (즉시 시작하지 않음 — 호스트가 startMeeting을 호출해야 in-progress)
  @Post()
  create(
    @CurrentUser() user: CurrentUserPayload,
    @Body()
    body: {
      title: string
      groupId?: string
      projectId?: string
      visibility?: 'public' | 'private'
      participants?: { userId: string; userName: string }[]
    },
  ) {
    return this.meetingsService.createMeeting(body.title, user.userId, {
      groupId: body.groupId,
      projectId: body.projectId,
      visibility: body.visibility,
      participants: body.participants,
    })
  }

  // 회의 시작 — 호스트만
  @Post(':id/start')
  @HttpCode(200)
  startMeeting(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.meetingsService.startMeeting(id, user.userId)
  }

  // 회의 삭제 — 호스트 또는 조직 owner/admin
  @Delete(':id')
  @HttpCode(200)
  deleteMeeting(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.meetingsService.deleteMeeting(id, user.userId)
  }

  // 오디오 파일 업로드 → 디스크 저장 → STT
  @Post(':id/audio')
  @UseInterceptors(
    FileInterceptor('audio', {
      storage: diskStorage({
        destination: AUDIO_UPLOAD_DIR,
        filename: (_req, file, cb) => {
          const ext = path.extname(file.originalname).toLowerCase() || '.webm'
          cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`)
        },
      }),
      limits: { fileSize: AUDIO_MAX_BYTES }, // MEETING_AUDIO_MAX_MB env
      fileFilter: (_req, file, cb) => {
        if (ALLOWED_AUDIO_MIME.has(file.mimetype)) {
          cb(null, true)
        } else {
          cb(
            new BadRequestException(
              `허용되지 않는 오디오 형식: ${file.mimetype}`,
            ),
            false,
          )
        }
      },
    }),
  )
  uploadAudio(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('speakerMap') speakerMapRaw?: string,
  ) {
    if (!file) throw new BadRequestException('오디오 파일이 없습니다')
    let speakerMap: Record<string, string> | undefined
    if (speakerMapRaw) {
      try {
        speakerMap = JSON.parse(speakerMapRaw) as Record<string, string>
      } catch {
        // 파싱 실패 시 speakerMap 없이 처리
      }
    }
    return this.meetingsService.uploadAudio(id, file.path, file.mimetype, file.filename, speakerMap)
  }

  // 회의 종료 → 회의록 자동 생성 (호스트 또는 조직 관리자만)
  @Put(':id/end')
  endMeeting(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.meetingsService.endMeeting(id, user.userId)
  }

  // 회의 입장 등록 — DB에 없는 동적 참가자도 meeting_participants에 upsert
  @Post(':id/join')
  @HttpCode(200)
  joinMeeting(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.meetingsService.joinMeeting(id, user.userId, user.userName)
  }

  // 참가자 나가기 — 호스트 이전 및 빈 방 자동 종료 처리
  @Post(':id/leave')
  @HttpCode(200)
  leaveMeeting(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body() body: { remainingParticipantIds?: string[]; isLastParticipant?: boolean },
  ) {
    return this.meetingsService.leaveMeeting(id, user.userId, {
      remainingParticipantIds: body.remainingParticipantIds,
      isLastParticipant: body.isLastParticipant,
    })
  }

  // 내가 접근 가능한 회의 목록 — 호스트 + 참여자로 지정된 회의 + 활성 조직의 공개 회의
  @Get('my')
  getMyMeetings(
    @CurrentUser() user: CurrentUserPayload,
    @Query('orgId') orgId?: string,
  ) {
    return this.meetingsService.getAccessibleMeetings(user.userId, orgId)
  }

  // 프로젝트 회의 목록 — 반드시 ':id' 라우트보다 앞에 위치해야 함
  @Get('project/:projectId')
  getMeetingsByProject(@Param('projectId') projectId: string) {
    return this.meetingsService.getMeetingsByProject(projectId)
  }

  // 회의 상세 — 비공개 회의는 참여자만 접근 가능
  @Get(':id')
  async getMeeting(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    await this.meetingsService.assertCanAccess(id, user.userId)
    return this.meetingsService.getMeeting(id)
  }

  // 트랜스크립트 조회 — 비공개 회의는 참여자만
  @Get(':id/transcript')
  async getTranscript(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    await this.meetingsService.assertCanAccess(id, user.userId)
    return this.meetingsService.getTranscript(id)
  }

  // 회의록 조회 — 비공개 회의는 참여자만
  @Get(':id/summary')
  async getSummary(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    await this.meetingsService.assertCanAccess(id, user.userId)
    return this.meetingsService.getSummary(id)
  }

  // 액션아이템 조회 — 비공개 회의는 참여자만
  @Get(':id/action-items')
  async getActionItems(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    await this.meetingsService.assertCanAccess(id, user.userId)
    return this.meetingsService.getActionItems(id)
  }

  // 액션아이템 수정
  @Put(':id/action-items/:aid')
  updateActionItem(
    @Param('aid') aid: string,
    @Body() body: { title?: string; assignee?: string; dueDate?: string },
  ) {
    return this.meetingsService.updateActionItem(aid, body)
  }

  // 확인된 액션아이템 → Task 일괄 등록
  @Post(':id/action-items/confirm')
  confirmActionItems(
    @Param('id') id: string,
    @Body() body: { actionItemIds: string[] },
  ) {
    return this.meetingsService.confirmActionItems(id, body.actionItemIds)
  }
}
