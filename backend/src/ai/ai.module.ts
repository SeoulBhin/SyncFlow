import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { AiController } from './ai.controller'
import { AiService } from './ai.service'
import { RagService } from './rag.service'
import { EmbeddingService } from './embedding.service'

// 기존 엔티티 (ai_knowledge, ai_chat_history)
import { AiKnowledge } from './entities/ai-knowledge.entity'
import { AiChatHistory } from './entities/ai-chat-history.entity'

// 신규 엔티티 (ai_conversations, ai_messages, embeddings)
import { AiConversation } from './entities/ai-conversation.entity'
import { AiMessage } from './entities/ai-message.entity'
import { DocumentEmbedding } from './entities/document-embedding.entity'

import { AuthModule } from '../auth/auth.module'

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AiKnowledge,
      AiChatHistory,
      AiConversation,
      AiMessage,
      DocumentEmbedding,
    ]),
    AuthModule,
  ],
  controllers: [AiController],
  providers: [AiService, RagService, EmbeddingService],
  exports: [AiService, RagService, EmbeddingService],
})
export class AiModule {}
