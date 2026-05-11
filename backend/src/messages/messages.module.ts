import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Message } from './entities/message.entity'
import { MessageReaction } from './entities/message-reaction.entity'
import { MessagesController } from './messages.controller'
import { MessagesService } from './messages.service'
import { MessagesGateway } from './messages.gateway'
import { ChannelsModule } from '../channels/channels.module'
import { AuthModule } from '../auth/auth.module'
import { AiModule } from '../ai/ai.module'

@Module({
  imports: [
    TypeOrmModule.forFeature([Message, MessageReaction]),
    ChannelsModule,
    AuthModule,
    AiModule,   // @AI 멘션 처리용
  ],
  controllers: [MessagesController],
  providers: [MessagesService, MessagesGateway],
  exports: [MessagesService, MessagesGateway],
})
export class MessagesModule {}
