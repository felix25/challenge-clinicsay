import { BadRequestException, Injectable } from '@nestjs/common';
import { Clock } from '../../../../shared/application/ports/clock';
import {
  InboundDecision,
  InboundMessageRepository,
} from '../ports/inbound-message.repository';

export interface InboundMessageInput {
  messageId?: unknown;
  from?: unknown;
  text?: unknown;
  receivedAt?: unknown;
}

@Injectable()
export class ProcessInboundMessageUseCase {
  constructor(
    private readonly clock: Clock,
    private readonly repository: InboundMessageRepository,
  ) {}

  async execute(input: InboundMessageInput): Promise<Record<string, never>> {
    if (
      !input ||
      typeof input.messageId !== 'string' ||
      !input.messageId.trim() ||
      typeof input.from !== 'string' ||
      !/^\+[1-9]\d{7,14}$/.test(input.from) ||
      typeof input.text !== 'string' ||
      typeof input.receivedAt !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(
        input.receivedAt,
      )
    ) {
      throw new BadRequestException('Invalid inbound message');
    }

    const receivedAt = new Date(input.receivedAt);

    if (Number.isNaN(receivedAt.getTime())) {
      throw new BadRequestException('Invalid receivedAt');
    }

    const normalized = input.text
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toUpperCase();

    let decision: InboundDecision = 'ignore';

    if (normalized === 'SI') {
      decision = 'confirm';
    } else if (normalized === 'NO') {
      decision = 'cancel';
    }

    await this.repository.process(
      {
        messageId: input.messageId,
        from: input.from,
        text: input.text,
        receivedAt,
      },
      decision,
      this.clock.now(),
    );

    return {};
  }
}
