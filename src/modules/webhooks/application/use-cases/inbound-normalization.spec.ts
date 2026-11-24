import { jest } from '@jest/globals';
import { Clock } from '../../../../shared/application/ports/clock';
import { InboundMessageRepository } from '../ports/inbound-message.repository';
import { ProcessInboundMessageUseCase } from './process-inbound-message.use-case';

describe('Inbound message normalization', () => {
  const now = new Date('2026-11-23T15:00:00Z');

  const process = jest.fn(async () => {});

  const clock: Clock = {
    now: () => now,
  };

  const repository: InboundMessageRepository = {
    process,
  };

  const useCase = new ProcessInboundMessageUseCase(
    clock,
    repository,
  );

  beforeEach(() => {
    process.mockClear();
  });

  it.each([
    ['SI', 'confirm'],
    ['Sí', 'confirm'],
    [' si ', 'confirm'],
    ['si.', 'confirm'],
    ['¡Sí!', 'confirm'],
    ['¿SI?', 'confirm'],
    ['NO!', 'cancel'],
    ['¿No?', 'cancel'],
    ['  ¡no!  ', 'cancel'],
    ['No puedo asistir', 'ignore'],
    ['S.I.', 'ignore'],
    ['SI NO', 'ignore'],
    ['Hola', 'ignore'],
  ])('normalizes "%s" as "%s"', async (text, expected) => {
    await useCase.execute({
      messageId: 'message-001',
      from: '+51987654321',
      text,
      receivedAt: now.toISOString(),
    });

    expect(process).toHaveBeenCalledWith(
      {
        messageId: 'message-001',
        from: '+51987654321',
        text,
        receivedAt: now,
      },
      expected,
      now,
    );
  });
});
