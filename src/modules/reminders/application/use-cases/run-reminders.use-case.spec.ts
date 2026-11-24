import { jest } from '@jest/globals';
import { RunRemindersUseCase } from './run-reminders.use-case';
import { Clock } from '../../../../shared/application/ports/clock';
import {
  ClaimedReminder,
  ReminderDeliveryRepository,
} from '../ports/reminder-delivery.repository';
import { MessageProvider } from '../ports/message-provider';

describe('RunRemindersUseCase', () => {
  const now = new Date('2026-11-23T15:00:00Z');

  const reminder: ClaimedReminder = {
    id: 'reminder-001',
    claimToken: 'claim-001',
    appointmentId: 'appointment-001',
    startsAt: new Date('2026-11-24T15:00:00Z'),
    appointmentStatus: 'scheduled',
    patientName: 'Ana',
    phone: '+51999999999',
    acceptsReminders: true,
    clinicName: 'Clinica Central',
    timezone: 'America/Lima',
  };

  let clock: jest.Mocked<Clock>;
  let repository: jest.Mocked<ReminderDeliveryRepository>;
  let provider: jest.Mocked<MessageProvider>;
  let useCase: RunRemindersUseCase;

  beforeEach(() => {
    clock = {
      now: jest.fn().mockReturnValue(now),
    };

    repository = {
      claimNext: jest.fn().mockResolvedValue(null),
      complete: jest.fn().mockResolvedValue(undefined),
    };

    provider = {
      send: jest.fn().mockResolvedValue('sent'),
    };

    useCase = new RunRemindersUseCase(
      clock,
      repository,
      provider,
    );
  });

  it('returns zero when no reminders are due', async () => {
    await expect(useCase.execute()).resolves.toEqual({
      processed: 0,
    });

    expect(provider.send).not.toHaveBeenCalled();
  });

  it('sends the reminder using its ID as idempotency key', async () => {
    repository.claimNext.mockResolvedValueOnce(reminder);

    await expect(useCase.execute()).resolves.toEqual({
      processed: 1,
    });

    expect(provider.send).toHaveBeenCalledTimes(1);

    expect(provider.send).toHaveBeenCalledWith(
      reminder.phone,
      'Hola Ana, te recordamos tu cita en Clinica Central el 24/11/2026 a las 10:00. Responde SI para confirmar o NO para cancelar.',
      reminder.id,
    );

    expect(repository.complete).toHaveBeenCalledWith(
      reminder,
      'sent',
      now,
    );
  });

  it('delegates retryable failures to the repository', async () => {
    repository.claimNext.mockResolvedValueOnce(reminder);
    provider.send.mockResolvedValue('retry');

    await useCase.execute();

    expect(repository.complete).toHaveBeenCalledWith(
      reminder,
      'retry',
      now,
    );
  });

  it('handles permanent provider failures', async () => {
    repository.claimNext.mockResolvedValueOnce(reminder);
    provider.send.mockResolvedValue('failed');

    await useCase.execute();

    expect(repository.complete).toHaveBeenCalledWith(
      reminder,
      'failed',
      now,
    );
  });

  it('skips reminders when the appointment has started', async () => {
    const expired = {
      ...reminder,
      startsAt: now,
    };

    repository.claimNext.mockResolvedValueOnce(expired);

    await useCase.execute();

    expect(provider.send).not.toHaveBeenCalled();

    expect(repository.complete).toHaveBeenCalledWith(
      expired,
      'skipped',
      now,
      'too_late',
    );
  });

  it('skips patients without a phone number', async () => {
    const noPhone = {
      ...reminder,
      phone: null,
    };

    repository.claimNext.mockResolvedValueOnce(noPhone);

    await useCase.execute();

    expect(provider.send).not.toHaveBeenCalled();

    expect(repository.complete).toHaveBeenCalledWith(
      noPhone,
      'skipped',
      now,
      'no_phone',
    );
  });

  it('skips patients who opted out', async () => {
    const optedOut = {
      ...reminder,
      acceptsReminders: false,
    };

    repository.claimNext.mockResolvedValueOnce(optedOut);

    await useCase.execute();

    expect(provider.send).not.toHaveBeenCalled();

    expect(repository.complete).toHaveBeenCalledWith(
      optedOut,
      'skipped',
      now,
      'opted_out',
    );
  });
});
