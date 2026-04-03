// backend/src/document/hocuspocus.server.ts

import { Server } from '@hocuspocus/server'
import { JwtService } from '@nestjs/jwt'
import { Repository } from 'typeorm'
import { Page } from './entities/page.entity'
import { PageVersion } from './entities/page-version.entity'

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

    async onAuthenticate(data) {
      // TODO: Part 2 완료 후 아래 주석 해제, dev 코드 제거
      // const token = data.token
      // if (!token) throw new Error('토큰이 없습니다. 로그인하세요.')
      // try {
      //   const payload = jwtService.verify(token)
      //   return { userId: payload.sub }
      // } catch {
      //   throw new Error('유효하지 않은 토큰입니다.')
      // }
      return { userId: 'dev-user' }  // 개발 중 임시 스킵
    },

    async onStoreDocument(data) {
      const content = JSON.stringify(data.document.toJSON())
      const existing = saveTimers.get(data.documentName)
      if (existing) clearTimeout(existing)

      const timer = setTimeout(async () => {
        try {
          // 1. 현재 내용 저장
          await pageRepository.update(data.documentName, { content })
          // 2. 버전 스냅샷 저장
          await pageVersionRepository.save({
            page: { id: data.documentName },
            content,
          })
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
