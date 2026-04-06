import {
  Controller, Post, Put, Get, Param, Body,
  UseGuards, Req, UploadedFile, UseInterceptors,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { MeetingsService } from './meetings.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { User } from '../auth/entities/user.entity'

@Controller('meetings')
@UseGuards(JwtAuthGuard)
export class MeetingsController {
  constructor(private meetingsService: MeetingsService) {}

  // 회의 생성
  @Post()
  create(
    @Req() req: { user: User },
    @Body() body: { title: string; groupId?: string; projectId?: string },
  ) {
    return this.meetingsService.createMeeting(body.title, req.user.id, body.groupId, body.projectId)
  }

  // 오디오 파일 업로드 → STT
  @Post(':id/audio')
  @UseInterceptors(FileInterceptor('audio'))
  uploadAudio(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.meetingsService.uploadAudio(id, file.buffer, file.mimetype)
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
}
