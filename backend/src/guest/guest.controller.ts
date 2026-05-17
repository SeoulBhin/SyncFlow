import { Controller, Get, Post, Param, Body } from '@nestjs/common'
import { IsString, IsNotEmpty, MaxLength } from 'class-validator'
import { GuestService } from './guest.service'

class GuestJoinDto {
  @IsString()
  @IsNotEmpty({ message: '이름을 입력해주세요' })
  @MaxLength(50, { message: '이름은 50자 이하여야 합니다' })
  guestName: string
}

// JwtAuthGuard 없음 — 게스트 공개 엔드포인트
@Controller('guest')
export class GuestController {
  constructor(private guestService: GuestService) {}

  /** GET /api/guest/meetings/:token — 토큰 유효성 확인 + 회의 기본 정보 반환 */
  @Get('meetings/:token')
  getInviteInfo(@Param('token') token: string) {
    return this.guestService.getInviteInfo(token)
  }

  /** POST /api/guest/meetings/:token/join — 이름 입력 후 게스트 LiveKit 토큰 발급 */
  @Post('meetings/:token/join')
  joinAsGuest(@Param('token') token: string, @Body() body: GuestJoinDto) {
    return this.guestService.joinAsGuest(token, body.guestName)
  }

  /**
   * GET /api/guest/meetings/:token/materials
   * 회의의 협업 자료(pages) 목록 — 읽기 전용, 인증 없음
   * 게스트는 목록 열람만 가능. 편집/업로드/삭제 불가.
   */
  @Get('meetings/:token/materials')
  getMeetingMaterials(@Param('token') token: string) {
    return this.guestService.getMeetingMaterials(token)
  }

  /**
   * GET /api/guest/meetings/:token/materials/:pageId
   * 협업 자료 상세 조회 — 읽기 전용, 인증 없음
   * pageId가 해당 회의 projectId 소속인지 서비스 레이어에서 검증.
   */
  @Get('meetings/:token/materials/:pageId')
  getMaterialDetail(@Param('token') token: string, @Param('pageId') pageId: string) {
    return this.guestService.getMaterialDetail(token, pageId)
  }
}
