import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, DataSource } from 'typeorm'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { DocumentEmbedding } from './entities/document-embedding.entity'

const CHUNK_SIZE = 500
const CHUNK_OVERLAP = 50
const EMBED_RATE_LIMIT_MS = 150

@Injectable()
export class EmbeddingService {
  private readonly logger = new Logger(EmbeddingService.name)
  private readonly genAI: GoogleGenerativeAI | null

  constructor(
    private readonly config: ConfigService,
    @InjectRepository(DocumentEmbedding)
    private readonly embeddingRepo: Repository<DocumentEmbedding>,
    private readonly dataSource: DataSource,
  ) {
    const apiKey = this.config.get<string>('GEMINI_API_KEY', '')
    if (!apiKey) {
      this.logger.error('GEMINI_API_KEY가 설정되지 않았습니다. 임베딩 기능이 비활성화됩니다.')
      this.genAI = null
    } else {
      this.genAI = new GoogleGenerativeAI(apiKey)
    }
  }

  private requireGenAI(): GoogleGenerativeAI {
    if (!this.genAI) {
      throw new InternalServerErrorException('GEMINI_API_KEY가 설정되지 않았습니다')
    }
    return this.genAI
  }

  // ── 임베딩 생성 ────────────────────────────────────────────────────────────

  async embed(text: string): Promise<number[]> {
    try {
      const model = this.requireGenAI().getGenerativeModel({ model: 'text-embedding-004' })
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
  ): Promise<{ indexed: number; pageCount: number }> {
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

    let totalIndexed = 0
    for (const page of pages) {
      const textContent = this.extractTextFromContent(page.content, page.type)
      if (!textContent.trim()) continue

      const count = await this.indexPage(page.id, textContent, {
        pageTitle: page.title,
        pageType: page.type,
        projectId,
        language: page.language ?? undefined,
      })
      totalIndexed += count

      await this.sleep(EMBED_RATE_LIMIT_MS)
    }

    this.logger.log(
      `프로젝트 인덱싱 완료: projectId=${projectId}, 페이지=${pages.length}, 청크=${totalIndexed}`,
    )
    return { indexed: totalIndexed, pageCount: pages.length }
  }

  async getIndexedPagesByProject(projectId: string): Promise<
    Array<{
      pageId: string
      chunkCount: number
      title: string | null
      updatedAt: Date
    }>
  > {
    try {
      const rows = await this.dataSource.query<
        Array<{
          page_id: string
          chunk_count: string
          title: string | null
          updated_at: Date
        }>
      >(
        `SELECT e.page_id,
                COUNT(*) AS chunk_count,
                MAX((e.metadata->>'pageTitle')::text) AS title,
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
        updatedAt: r.updated_at,
      }))
    } catch (err) {
      this.logger.warn(`인덱싱된 파일 조회 실패: ${(err as Error).message}`)
      return []
    }
  }

  // ── 콘텐츠 텍스트 추출 ────────────────────────────────────────────────────

  extractTextFromContent(content: unknown, type: string): string {
    if (content === null || content === undefined) return ''

    if (type === 'code') {
      if (typeof content === 'string') return content
      if (typeof content === 'object') {
        const obj = content as Record<string, unknown>
        if (typeof obj['code'] === 'string') return obj['code'] as string
        if (typeof obj['text'] === 'string') return obj['text'] as string
        return JSON.stringify(content)
      }
      return ''
    }

    // 문서 페이지: TipTap JSON에서 텍스트 재귀 추출
    return this.extractTipTapText(content)
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
