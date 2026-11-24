import { Module } from '@nestjs/common';
import { PrismaService } from '../../shared/infrastructure/prisma/prisma.service';
import { InboundMessageRepository } from './application/ports/inbound-message.repository';
import { ProcessInboundMessageUseCase } from './application/use-cases/process-inbound-message.use-case';
import { InboundMessagesController } from './infrastructure/http/inbound-messages.controller';
import { PrismaInboundMessageRepository } from './infrastructure/prisma/prisma-inbound-message.repository';

@Module({
  controllers: [InboundMessagesController],
  providers: [
    PrismaService,
    ProcessInboundMessageUseCase,
    {
      provide: InboundMessageRepository,
      useClass: PrismaInboundMessageRepository,
    },
  ],
})
export class WebhooksModule {}
