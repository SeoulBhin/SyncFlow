import {
  Controller,
  Post,
  Put,
  Get,
  Param,
  Body,
  UseGuards,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
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

  // 회의 생성
  @Post()
  create(
    @CurrentUser() user: CurrentUserPayload,
    @Body() body: { title: string; groupId?: string; projectId?: string },
  ) {
    return this.meetingsService.createMeeting(
      body.title,
      user.userId,
      body.groupId,
      body.projectId,
    )
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
  ) {
    if (!file) throw new BadRequestException('오디오 파일이 없습니다')
    return this.meetingsService.uploadAudio(id, file.path, file.mimetype, file.filename)
  }

  // 회의 종료 → 회의록 자동 생성
  @Put(':id/end')
  endMeeting(@Param('id') id: string) {
    return this.meetingsService.endMeeting(id)
  }

  // 회의 상세
  @Get(':id')
  getMeeting(@Param('id') id: string) {
    return this.meetingsService.getMeeting(id)
  }

  // 트랜스크립트 조회
  @Get(':id/transcript')
  getTranscript(@Param('id') id: string) {
    return this.meetingsService.getTranscript(id)
  }

  // 회의록 조회
  @Get(':id/summary')
  getSummary(@Param('id') id: string) {
    return this.meetingsService.getSummary(id)
  }

  // 액션아이템 조회
  @Get(':id/action-items')
  getActionItems(@Param('id') id: string) {
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

  // 확인된 액션아이템 → 작업 등록
  @Post(':id/action-items/confirm')
  confirmActionItems(
    @Param('id') id: string,
    @Body() body: { actionItemIds: string[] },
  ) {
    return this.meetingsService.confirmActionItems(id, body.actionItemIds)
  }

  // 프로젝트 회의 목록
  @Get('project/:projectId')
  getMeetingsByProject(@Param('projectId') projectId: string) {
    return this.meetingsService.getMeetingsByProject(projectId)
  }
}
