import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import {
  InboundMessageInput,
  ProcessInboundMessageUseCase,
} from '../../application/use-cases/process-inbound-message.use-case';

@Controller('webhooks')
export class InboundMessagesController {
  constructor(
    private readonly processInboundMessage: ProcessInboundMessageUseCase,
  ) {}

  @Post('inbound-messages')
  @HttpCode(200)
  execute(@Body() body: InboundMessageInput) {
    return this.processInboundMessage.execute(body);
  }
}
