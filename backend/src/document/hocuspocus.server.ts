// backend/src/document/hocuspocus.server.ts

import { Server } from '@hocuspocus/server'
import { JwtService } from '@nestjs/jwt'
import { Repository } from 'typeorm'
import * as Y from 'yjs'
import { Page } from '../pages/entities/page.entity'
import { PageVersion } from '../pages/entities/page-version.entity'

export function createHocuspocusServer(
  jwtService: JwtService,
  pageRepository: Repository<Page>,
  pageVersionRepository: Repository<PageVersion>,
) {
  // 1.5초 디바운싱: 계속 타이핑 중이면 기다렸다가 저장
  const saveTimers = new Map<string, ReturnType<typeof setTimeout>>()

  return new Server({
    port: 1234,

    async onConnect(data) {
      console.log('누군가 접속했습니다:', data.socketId)
    },

    async onLoadDocument({ document, documentName }) {
      const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      if (!UUID_RE.test(documentName)) return

      try {
        const page = await pageRepository.findOne({ where: { id: documentName } })
        if (!page?.content || typeof page.content !== 'string') return

        // base64 Yjs 바이너리 상태를 Y.Doc에 복원
        const update = Buffer.from(page.content, 'base64')
        Y.applyUpdate(document, update)
        console.log(`[hocuspocus] 문서 로드 완료: ${documentName}`)
      } catch {
        // HTML 상태이거나 손상된 경우 → 빈 문서로 시작
        console.log(`[hocuspocus] 문서 로드 스킵 (새 문서 또는 HTML 상태): ${documentName}`)
      }
    },

    async onAuthenticate(data) {
      const { token, socketId } = data

      // 개발 모드: 토큰 유무·유효성 관계없이 전부 허용 — JwtAuthGuard x-user-id 패턴과 동일.
      // process.env.NODE_ENV 는 ConfigModule 이 .env 를 로드한 뒤 설정되므로 신뢰 가능.
      if (process.env.NODE_ENV === 'development') {
        let userId = 'dev-user'
        if (token) {
          try {
            const payload = jwtService.verify(token) as { sub: string }
            userId = payload.sub
          } catch {
            // 개발 모드: 검증 실패해도 dev-user 로 허용
          }
        }
        console.log(`[dev] 인증 통과 userId=${userId} (socket: ${socketId})`)
        return { userId }
      }

      // 프로덕션: 엄격한 JWT 검증
      if (!token) throw new Error('토큰이 없습니다. 로그인하세요.')
      try {
        const payload = jwtService.verify(token) as { sub: string }
        return { userId: payload.sub }
      } catch (err) {
        console.error(
          `[onAuthenticate] 토큰 검증 실패 (socket: ${socketId}): ${(err as Error).message}`,
        )
        throw new Error('유효하지 않은 토큰입니다.')
      }
    },

    async onStoreDocument(data) {
      // Y.encodeStateAsUpdate: toJSON() deprecated 대체 — 바이너리 상태를 base64로 저장
      const content = Buffer.from(Y.encodeStateAsUpdate(data.document)).toString('base64')
      const existing = saveTimers.get(data.documentName)
      if (existing) clearTimeout(existing)

      const timer = setTimeout(async () => {
        try {
          // 1. 현재 내용 저장
          await pageRepository.update(data.documentName, { content } as any)
          // 2. 버전 스냅샷 저장
          // 자동 저장 경로에는 사용자 ID가 없어 created_by 필수 버전 행은 만들지 않는다.
          console.log(`문서 저장 완료: ${data.documentName}`)
        } catch {
          // TODO: Part 3 완료 전까지 DB 없어서 저장 실패 — 무시
          console.log(`[dev] DB 저장 스킵: ${data.documentName}`)
        }
        saveTimers.delete(data.documentName)
      }, 1500)

      saveTimers.set(data.documentName, timer)
    },

    async onDisconnect(data) {
      console.log('누군가 나갔습니다:', data.socketId)
    },
  })
}
