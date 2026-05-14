import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, DataSource } from 'typeorm'
import { GoogleGenerativeAI } from '@google/generative-ai'
import * as Y from 'yjs'
import { DocumentEmbedding } from './entities/document-embedding.entity'

const CHUNK_SIZE = 500
const CHUNK_OVERLAP = 50
const EMBED_RATE_LIMIT_MS = 150

@Injectable()
export class EmbeddingService {
  private readonly logger = new Logger(EmbeddingService.name)
  private readonly genAI: GoogleGenerativeAI

  constructor(
    private readonly config: ConfigService,
    @InjectRepository(DocumentEmbedding)
    private readonly embeddingRepo: Repository<DocumentEmbedding>,
    private readonly dataSource: DataSource,
  ) {
    this.genAI = new GoogleGenerativeAI(this.config.getOrThrow<string>('GEMINI_API_KEY'))
  }

  // ── 임베딩 생성 ────────────────────────────────────────────────────────────

  async embed(text: string): Promise<number[]> {
    try {
      const model = this.genAI.getGenerativeModel({ model: 'text-embedding-004' })
      const result = await model.embedContent(text)
      return result.embedding.values
    } catch (err) {
      this.logger.error(`임베딩 생성 실패: ${(err as Error).message}`)
      throw new InternalServerErrorException('임베딩 생성에 실패했습니다')
    }
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    const results: number[][] = []
    for (const text of texts) {
      if (results.length > 0) {
        await this.sleep(EMBED_RATE_LIMIT_MS)
      }
      results.push(await this.embed(text))
    }
    return results
  }

  // ── 텍스트 청킹 ────────────────────────────────────────────────────────────

  // 500자 단위, 50자 오버랩으로 문맥 단절을 방지하는 청킹 (spec 요구사항)
  chunkWithOverlap(
    text: string,
    chunkSize: number = CHUNK_SIZE,
    overlap: number = CHUNK_OVERLAP,
  ): string[] {
    const cleaned = text.replace(/\s+/g, ' ').trim()
    if (cleaned.length === 0) return []
    if (cleaned.length <= chunkSize) return [cleaned]

    const chunks: string[] = []
    let start = 0

    while (start < cleaned.length) {
      const end = Math.min(start + chunkSize, cleaned.length)
      const chunk = cleaned.slice(start, end).trim()
      if (chunk.length > 0) {
        chunks.push(chunk)
      }
      if (end >= cleaned.length) break
      start = end - overlap
    }

    return chunks
  }

  // 문단 기반 청킹 (기존 지식 베이스 RAG용, 하위 호환 유지)
  splitIntoChunks(text: string, maxChunkSize = 1500): string[] {
    if (text.length <= maxChunkSize) return [text]

    const chunks: string[] = []
    const paragraphs = text.split(/\n{2,}/).filter((p) => p.trim())

    let current = ''
    for (const para of paragraphs) {
      if ((current + '\n\n' + para).length > maxChunkSize) {
        if (current) {
          chunks.push(current.trim())
          current = ''
        }
        if (para.length > maxChunkSize) {
          const sentences = para.split(/(?<=[.!?])\s+/)
          let sentenceGroup = ''
          for (const s of sentences) {
            if ((sentenceGroup + ' ' + s).length > maxChunkSize) {
              if (sentenceGroup) chunks.push(sentenceGroup.trim())
              sentenceGroup = s
            } else {
              sentenceGroup += (sentenceGroup ? ' ' : '') + s
            }
          }
          if (sentenceGroup) current = sentenceGroup
        } else {
          current = para
        }
      } else {
        current += (current ? '\n\n' : '') + para
      }
    }
    if (current.trim()) chunks.push(current.trim())

    return chunks.filter((c) => c.length > 0)
  }

  // ── 코사인 유사도 (pgvector 미설치 fallback용) ────────────────────────────

  cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0
    let dot = 0
    let normA = 0
    let normB = 0
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i]
      normA += a[i] * a[i]
      normB += b[i] * b[i]
    }
    const denom = Math.sqrt(normA) * Math.sqrt(normB)
    return denom === 0 ? 0 : dot / denom
  }

  // ── 페이지 인덱싱 (embeddings 테이블) ────────────────────────────────────

  async indexPage(
    pageId: string,
    textContent: string,
    metadata: Record<string, unknown> = {},
  ): Promise<number> {
    await this.embeddingRepo.delete({ pageId })

    const chunks = this.chunkWithOverlap(textContent)
    if (chunks.length === 0) return 0

    let indexed = 0
    for (let i = 0; i < chunks.length; i++) {
      if (i > 0) {
        await this.sleep(EMBED_RATE_LIMIT_MS)
      }
      try {
        const embedding = await this.embed(chunks[i])
        const vectorStr = `[${embedding.join(',')}]`

        await this.embeddingRepo.save(
          this.embeddingRepo.create({
            pageId,
            chunkIndex: i,
            content: chunks[i],
            vector: vectorStr,
            metadata: { ...metadata, chunkTotal: chunks.length },
          }),
        )
        indexed++
      } catch (err) {
        this.logger.warn(
          `청크 ${i} 임베딩 실패 (pageId=${pageId}): ${(err as Error).message}`,
        )
      }
    }

    this.logger.log(`페이지 인덱싱 완료: pageId=${pageId}, 청크=${indexed}/${chunks.length}`)
    return indexed
  }

  async indexProjectPages(
    projectId: string,
  ): Promise<{ indexed: number; pageCount: number; skipped: number; message: string }> {
    this.logger.log(`프로젝트 인덱싱 시작: projectId=${projectId}`)

    const pages = await this.dataSource.query<
      Array<{
        id: string
        title: string
        content: unknown
        type: string
        language: string | null
      }>
    >(
      `SELECT id, title, content, type, language FROM pages WHERE project_id = $1`,
      [projectId],
    )

    this.logger.log(`인덱싱 대상 페이지: ${pages.length}개 (projectId=${projectId})`)

    let totalIndexed = 0
    let skipped = 0
    for (const page of pages) {
      // 진단 로그: content 타입 확인
      const contentType = page.content === null || page.content === undefined
        ? 'null'
        : typeof page.content === 'string'
          ? `string(${(page.content as string).length}chars)`
          : `object(${JSON.stringify(page.content).slice(0, 80)})`
      this.logger.log(
        `페이지 분석: id=${page.id} title="${page.title}" type=${page.type} lang=${page.language ?? '-'} content=${contentType}`,
      )

      const textContent = this.extractTextFromContent(page.content, page.type, page.language)
      if (!textContent.trim()) {
        this.logger.warn(
          `페이지 스킵 (텍스트 없음): pageId=${page.id}, title="${page.title}", content=${contentType}`,
        )
        skipped++
        continue
      }

      this.logger.log(
        `페이지 인덱싱: pageId=${page.id}, title="${page.title}", textLen=${textContent.length}자`,
      )

      const count = await this.indexPage(page.id, textContent, {
        pageTitle: page.title,
        pageType: page.type,
        projectId,
        language: page.language ?? undefined,
      })
      totalIndexed += count

      await this.sleep(EMBED_RATE_LIMIT_MS)
    }

    // content가 null인 페이지 수 (저장 미완료)
    const nullContentCount = pages.filter(
      (p) => p.content === null || p.content === undefined,
    ).length

    const message =
      pages.length === 0
        ? '프로젝트에 문서나 코드 파일이 없습니다.'
        : totalIndexed === 0 && nullContentCount === pages.length
          ? '문서 저장이 완료된 후 다시 인덱싱해주세요. (문서를 열고 편집한 뒤 자동 저장이 완료되면 다시 시도하세요)'
          : totalIndexed === 0
            ? `${pages.length}개 페이지가 있지만 추출 가능한 텍스트가 없습니다. 문서에 내용을 작성하고 저장한 후 다시 인덱싱하세요.`
            : `${pages.length - skipped}개 파일 인덱싱 완료 (${skipped}개 스킵)`

    this.logger.log(
      `프로젝트 인덱싱 완료: projectId=${projectId}, 페이지=${pages.length}, 인덱싱=${totalIndexed}청크, 스킵=${skipped}`,
    )
    return { indexed: totalIndexed, pageCount: pages.length, skipped, message }
  }

  async getIndexedPagesByProject(projectId: string): Promise<
    Array<{
      pageId: string
      chunkCount: number
      title: string | null
      type: string | null
      updatedAt: Date
    }>
  > {
    try {
      const rows = await this.dataSource.query<
        Array<{
          page_id: string
          chunk_count: string
          title: string | null
          type: string | null
          updated_at: Date
        }>
      >(
        `SELECT e.page_id,
                COUNT(*) AS chunk_count,
                MAX((e.metadata->>'pageTitle')::text) AS title,
                MAX(p.type) AS type,
                MAX(e.updated_at) AS updated_at
         FROM embeddings e
         JOIN pages p ON p.id = e.page_id
         WHERE p.project_id = $1
         GROUP BY e.page_id
         ORDER BY MAX(e.updated_at) DESC`,
        [projectId],
      )

      return rows.map((r) => ({
        pageId: r.page_id,
        chunkCount: parseInt(r.chunk_count, 10),
        title: r.title,
        type: r.type,
        updatedAt: r.updated_at,
      }))
    } catch (err) {
      this.logger.warn(`인덱싱된 파일 조회 실패: ${(err as Error).message}`)
      return []
    }
  }

  // ── 콘텐츠 텍스트 추출 ────────────────────────────────────────────────────

  extractTextFromContent(content: unknown, type: string, language?: string | null): string {
    if (content === null || content === undefined) return ''

    // Hocuspocus 저장 형식: base64-encoded Yjs binary (string → JSONB → string)
    if (typeof content === 'string') {
      return this.extractYjsText(content, type, language ?? null)
    }

    // 객체 형태 (구형 TipTap JSON 저장 방식 또는 코드 객체)
    if (typeof content === 'object') {
      if (type === 'code') {
        const obj = content as Record<string, unknown>
        if (typeof obj['code'] === 'string') return obj['code'] as string
        if (typeof obj['text'] === 'string') return obj['text'] as string
        return JSON.stringify(content)
      }
      return this.extractTipTapText(content)
    }

    return ''
  }

  // Hocuspocus base64 Yjs 바이너리에서 텍스트 추출
  // 핵심: getXmlFragment/getText 호출 전에 share 키를 스냅샷해야
  // 새로운 빈 타입이 생성되어 실제 키가 오염되는 것을 방지한다
  private extractYjsText(base64: string, type: string, language: string | null): string {
    try {
      const update = Buffer.from(base64, 'base64')
      if (update.length < 4) {
        this.logger.debug(`Yjs 추출 스킵: base64 너무 짧음 (${update.length}bytes)`)
        return ''
      }

      const ydoc = new Y.Doc()
      Y.applyUpdate(ydoc, update)

      // applyUpdate 직후 share에 실제로 존재하는 키만 스냅샷
      const existingKeys = [...ydoc.share.keys()]
      this.logger.debug(
        `Yjs share 키: [${existingKeys.join(', ')}] (type=${type}, language=${language ?? 'none'})`,
      )

      let result = ''

      if (type === 'code') {
        // Monaco 코드 에디터: doc.getText(language.id) — 존재하는 키 중에서만 탐색
        const priorityKeys = language ? [language, ...existingKeys] : existingKeys
        for (const key of [...new Set(priorityKeys)]) {
          try {
            const ytext = ydoc.getText(key)
            const text = ytext.toString()
            if (text.trim()) {
              result = text
              break
            }
          } catch {
            // ignore — 타입 불일치
          }
        }
      } else {
        // TipTap 문서 에디터: XmlFragment 탐색 (존재하는 키 우선)
        // TipTap Collaboration extension의 기본 키는 'default'
        const xmlKeys = existingKeys.length > 0 ? existingKeys : ['default', 'prosemirror']
        for (const key of xmlKeys) {
          try {
            const fragment = ydoc.getXmlFragment(key)
            if (fragment.length > 0) {
              const text = this.extractXmlFragmentText(fragment)
              if (text.trim()) {
                result = text
                break
              }
            }
          } catch {
            // ignore — 타입 불일치
          }
        }

        // XmlFragment에서 못 찾으면 Y.Text 시도 (새 share 키 제외하고 기존 키만)
        if (!result) {
          for (const key of existingKeys) {
            try {
              const ytext = ydoc.getText(key)
              const text = ytext.toString()
              if (text.trim()) {
                result = text
                break
              }
            } catch {
              // ignore
            }
          }
        }
      }

      ydoc.destroy()

      if (result) {
        this.logger.debug(
          `Yjs 텍스트 추출 성공: ${result.length}자, 앞 100자: "${result.slice(0, 100)}"`,
        )
      } else {
        this.logger.debug(`Yjs 텍스트 추출 실패: share 키=${JSON.stringify(existingKeys)}`)
      }

      return result
    } catch (err) {
      this.logger.warn(`Yjs 파싱 오류: ${(err as Error).message}`)
      return ''
    }
  }

  // Y.XmlFragment → 텍스트 재귀 추출 (toArray() 사용)
  private extractXmlFragmentText(fragment: Y.XmlFragment): string {
    const parts: string[] = []
    this.walkXmlNode(fragment, parts)
    return parts.join(' ')
  }

  private walkXmlNode(node: Y.XmlFragment | Y.XmlElement | Y.XmlText, parts: string[]): void {
    if (node instanceof Y.XmlText) {
      const str = node.toString()
      if (str.trim()) parts.push(str)
      return
    }
    // XmlFragment and XmlElement: iterate children via toArray()
    for (const child of node.toArray()) {
      this.walkXmlNode(child as Y.XmlElement | Y.XmlText, parts)
    }
  }

  private extractTipTapText(node: unknown): string {
    if (!node || typeof node !== 'object') return ''
    const n = node as { type?: string; text?: string; content?: unknown[] }
    let text = ''
    if (typeof n.text === 'string') {
      text += n.text
    }
    if (Array.isArray(n.content)) {
      for (const child of n.content) {
        const childText = this.extractTipTapText(child)
        if (childText) {
          text += (text.length > 0 ? ' ' : '') + childText
        }
      }
    }
    return text
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}
