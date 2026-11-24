import { jest } from '@jest/globals';
import { BadRequestException } from '@nestjs/common';
import { Clock } from '../../../../shared/application/ports/clock';
import { InboundMessageRepository } from '../ports/inbound-message.repository';
import { ProcessInboundMessageUseCase } from './process-inbound-message.use-case';

describe('ProcessInboundMessageUseCase', () => {
  const now = new Date('2026-11-23T15:00:00Z');

  const input = {
    messageId: 'message-001',
    from: '+51999999999',
    text: 'SI',
    receivedAt: '2026-11-23T15:00:00Z',
  };

  let clock: jest.Mocked<Clock>;
  let repository: jest.Mocked<InboundMessageRepository>;
  let useCase: ProcessInboundMessageUseCase;

  beforeEach(() => {
    clock = {
      now: jest.fn<Clock['now']>().mockReturnValue(now),
    };

    repository = {
      process: jest.fn<InboundMessageRepository['process']>().mockResolvedValue(undefined),
    };

    useCase = new ProcessInboundMessageUseCase(
      clock,
      repository,
    );
  });

  it.each([
    ['SI', 'confirm'],
    ['  Sí  ', 'confirm'],
    ['no', 'cancel'],
    ['Gracias', 'ignore'],
  ])('normalizes "%s" as "%s"', async (text, decision) => {
    await expect(
      useCase.execute({ ...input, text }),
    ).resolves.toEqual({});

    expect(repository.process).toHaveBeenCalledWith(
      {
        messageId: input.messageId,
        from: input.from,
        text,
        receivedAt: new Date(input.receivedAt),
      },
      decision,
      now,
    );
  });

  it('rejects invalid inbound messages', async () => {
    await expect(
      useCase.execute({
        ...input,
        messageId: '',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(repository.process).not.toHaveBeenCalled();
  });
});
