import { Injectable, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { DataSource, Repository } from 'typeorm'
import { AiKnowledge } from './entities/ai-knowledge.entity'
import { EmbeddingService } from './embedding.service'
import { AddKnowledgeDto, SearchKnowledgeDto } from './dto/ai.dto'

export interface RagSearchResult {
  id: string
  title: string | null
  content: string
  sourceType: string
  sourceId: string | null
  similarity: number
}

export interface ProjectSearchResult {
  embeddingId: number
  pageId: string
  chunkIndex: number
  content: string
  similarity: number
  metadata: Record<string, unknown> | null
}

@Injectable()
export class RagService {
  private readonly logger = new Logger(RagService.name)

  constructor(
    @InjectRepository(AiKnowledge)
    private readonly knowledgeRepo: Repository<AiKnowledge>,
    private readonly embeddingService: EmbeddingService,
    private readonly dataSource: DataSource,
  ) {}

  // ── 지식 베이스 CRUD (ai_knowledge 테이블) ────────────────────────────────

  async addKnowledge(dto: AddKnowledgeDto): Promise<AiKnowledge[]> {
    const chunks = this.embeddingService.splitIntoChunks(dto.content)
    const embeddings = await this.embeddingService.embedBatch(chunks)

    const saved: AiKnowledge[] = []
    for (let i = 0; i < chunks.length; i++) {
      const knowledge = this.knowledgeRepo.create({
        groupId: dto.groupId ?? null,
        sourceType: dto.sourceType,
        sourceId: dto.sourceId ?? null,
        title: dto.title ?? null,
        content: chunks[i],
        embedding: JSON.stringify(embeddings[i]),
        chunkIndex: i,
        metadata: dto.metadata ?? null,
      })
      saved.push(await this.knowledgeRepo.save(knowledge))
    }

    this.logger.log(
      `지식 저장 완료: sourceType=${dto.sourceType} sourceId=${dto.sourceId} chunks=${chunks.length}`,
    )
    return saved
  }

  async reindexSource(sourceId: string, dto: AddKnowledgeDto): Promise<AiKnowledge[]> {
    await this.knowledgeRepo.delete({ sourceId })
    return this.addKnowledge({ ...dto, sourceId })
  }

  async deleteBySource(sourceId: string): Promise<void> {
    await this.knowledgeRepo.delete({ sourceId })
  }

  async listKnowledge(groupId?: string) {
    const rows = await this.knowledgeRepo
      .createQueryBuilder('k')
      .select(['k.sourceId', 'k.sourceType', 'k.title', 'k.groupId'])
      .addSelect('COUNT(*)', 'chunkCount')
      .addSelect('MAX(k.updatedAt)', 'updatedAt')
      .where(groupId ? 'k.groupId = :groupId' : '1=1', { groupId })
      .groupBy('k.sourceId, k.sourceType, k.title, k.groupId')
      .orderBy('MAX(k.updatedAt)', 'DESC')
      .getRawMany()

    return rows
  }

  // ── ai_knowledge 테이블 검색 (그룹 컨텍스트 기반) ────────────────────────

  async search(dto: SearchKnowledgeDto): Promise<RagSearchResult[]> {
    const limit = dto.limit ?? 5
    const queryEmbedding = await this.embeddingService.embed(dto.query)
    const vectorStr = `[${queryEmbedding.join(',')}]`

    try {
      const whereClause = dto.groupId
        ? `WHERE group_id = '${dto.groupId}' AND embedding IS NOT NULL`
        : 'WHERE embedding IS NOT NULL'

      const rows = await this.dataSource.query<
        Array<{
          id: string
          title: string | null
          content: string
          source_type: string
          source_id: string | null
          similarity: number
        }>
      >(
        `SELECT id, title, content, source_type, source_id,
                1 - (embedding::vector <=> $1::vector) AS similarity
         FROM ai_knowledge
         ${whereClause}
         ORDER BY embedding::vector <=> $1::vector
         LIMIT $2`,
        [vectorStr, limit],
      )

      return rows.map((r) => ({
        id: r.id,
        title: r.title,
        content: r.content,
        sourceType: r.source_type,
        sourceId: r.source_id,
        similarity: Number(r.similarity),
      }))
    } catch (err) {
      this.logger.warn(
        `pgvector 쿼리 실패, JS fallback 사용: ${(err as Error).message}`,
      )
      return this.searchFallback(queryEmbedding, dto)
    }
  }

  private async searchFallback(
    queryEmbedding: number[],
    dto: SearchKnowledgeDto,
  ): Promise<RagSearchResult[]> {
    const limit = dto.limit ?? 5
    const where: Record<string, unknown> = {}
    if (dto.groupId) where.groupId = dto.groupId

    const all = await this.knowledgeRepo.find({
      where: where as any,
      select: ['id', 'title', 'content', 'sourceType', 'sourceId', 'embedding'],
    })

    return all
      .filter((k) => k.embedding)
      .map((k) => {
        const vec = JSON.parse(k.embedding!) as number[]
        const sim = this.embeddingService.cosineSimilarity(queryEmbedding, vec)
        return { k, sim }
      })
      .sort((a, b) => b.sim - a.sim)
      .slice(0, limit)
      .map(({ k, sim }) => ({
        id: k.id,
        title: k.title,
        content: k.content,
        sourceType: k.sourceType,
        sourceId: k.sourceId,
        similarity: sim,
      }))
  }

  // ── embeddings 테이블 검색 (프로젝트 컨텍스트 기반, Top-5 코사인 유사도) ─

  async searchProjectEmbeddings(
    query: string,
    projectId: string,
    limit: number = 5,
  ): Promise<ProjectSearchResult[]> {
    const queryEmbedding = await this.embeddingService.embed(query)
    const vectorStr = `[${queryEmbedding.join(',')}]`

    try {
      const rows = await this.dataSource.query<
        Array<{
          id: number
          page_id: string
          chunk_index: number
          content: string
          similarity: number
          metadata: Record<string, unknown> | null
        }>
      >(
        `SELECT e.id, e.page_id, e.chunk_index, e.content, e.metadata,
                1 - (e.vector::vector <=> $1::vector) AS similarity
         FROM embeddings e
         JOIN pages p ON p.id = e.page_id
         WHERE p.project_id = $2
           AND e.vector IS NOT NULL
         ORDER BY e.vector::vector <=> $1::vector
         LIMIT $3`,
        [vectorStr, projectId, limit],
      )

      return rows.map((r) => ({
        embeddingId: r.id,
        pageId: r.page_id,
        chunkIndex: r.chunk_index,
        content: r.content,
        similarity: Number(r.similarity),
        metadata: r.metadata,
      }))
    } catch (err) {
      this.logger.warn(`프로젝트 임베딩 검색 실패, fallback 사용: ${(err as Error).message}`)
      return this.searchProjectFallback(queryEmbedding, projectId, limit)
    }
  }

  private async searchProjectFallback(
    queryEmbedding: number[],
    projectId: string,
    limit: number,
  ): Promise<ProjectSearchResult[]> {
    try {
      const rows = await this.dataSource.query<
        Array<{
          id: number
          page_id: string
          chunk_index: number
          content: string
          vector: string | null
          metadata: Record<string, unknown> | null
        }>
      >(
        `SELECT e.id, e.page_id, e.chunk_index, e.content, e.vector, e.metadata
         FROM embeddings e
         JOIN pages p ON p.id = e.page_id
         WHERE p.project_id = $1 AND e.vector IS NOT NULL`,
        [projectId],
      )

      return rows
        .filter((r) => r.vector !== null)
        .map((r) => {
          let vec: number[] = []
          try {
            vec = JSON.parse(r.vector!) as number[]
          } catch {
            return null
          }
          const similarity = this.embeddingService.cosineSimilarity(queryEmbedding, vec)
          return {
            embeddingId: r.id,
            pageId: r.page_id,
            chunkIndex: r.chunk_index,
            content: r.content,
            similarity,
            metadata: r.metadata,
          }
        })
        .filter((item): item is ProjectSearchResult => item !== null)
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit)
    } catch {
      return []
    }
  }

  // ── RAG 프롬프트 조합 ─────────────────────────────────────────────────────

  buildRagSystemPrompt(
    ragChunks: ProjectSearchResult[],
    referencedPageContents: Array<{ title: string; content: string }> = [],
  ): string {
    const base = `당신은 SyncFlow 워크스페이스의 AI 어시스턴트입니다. 팀원들의 업무를 돕습니다.

기본 원칙:
- 한국어로 답변 (사용자가 다른 언어를 쓰면 그에 맞춤)
- 명확하고 실용적인 답변 제공
- 마크다운 형식 적극 활용
- 모르는 내용은 솔직히 인정`

    const ragSection =
      ragChunks.length > 0
        ? `\n\n## 관련 프로젝트 문서 (RAG 검색 결과)\n${ragChunks
            .map((c, i) => {
              const pageTitle =
                typeof c.metadata?.pageTitle === 'string'
                  ? c.metadata.pageTitle
                  : '프로젝트 문서'
              return `[참고 ${i + 1}] **${pageTitle}**\n${c.content}`
            })
            .join('\n\n')}\n\n위 문서를 우선적으로 참고하세요. 컨텍스트에 없는 내용은 일반 지식으로 보완하되 명확히 구분하세요.`
        : ''

    const referencedSection =
      referencedPageContents.length > 0
        ? `\n\n## 사용자가 명시적으로 참조한 파일\n${referencedPageContents
            .map((p) => `### ${p.title}\n${p.content}`)
            .join('\n\n')}`
        : ''

    return `${base}${ragSection}${referencedSection}`
  }
}
