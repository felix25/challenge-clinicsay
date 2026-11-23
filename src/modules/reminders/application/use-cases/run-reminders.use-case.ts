import { Injectable } from '@nestjs/common';
import { Clock } from '../../../../shared/application/ports/clock';
import { buildReminderMessage } from '../../../appointments/domain/reminder-message';
import { MessageProvider } from '../ports/message-provider';
import { ReminderDeliveryRepository } from '../ports/reminder-delivery.repository';

@Injectable()
export class RunRemindersUseCase {
  constructor(
    private readonly clock: Clock,
    private readonly repository: ReminderDeliveryRepository,
    private readonly provider: MessageProvider,
  ) {}

  async execute(): Promise<{ processed: number }> {
    const now = this.clock.now();
    let processed = 0;

    while (true) {
      const reminder = await this.repository.claimNext(now);
      if (!reminder) break;

      processed++;

      if (reminder.appointmentStatus === 'cancelled' ||
          now >= reminder.startsAt) {
        await this.repository.complete(
          reminder,
          'skipped',
          now,
          'too_late',
        );
        continue;
      }

      if (!reminder.phone) {
        await this.repository.complete(
          reminder,
          'skipped',
          now,
          'no_phone',
        );
        continue;
      }

      if (!reminder.acceptsReminders) {
        await this.repository.complete(
          reminder,
          'skipped',
          now,
          'opted_out',
        );
        continue;
      }

      const text = buildReminderMessage({
        patientName: reminder.patientName,
        clinicName: reminder.clinicName,
        startsAt: reminder.startsAt,
        timezone: reminder.timezone,
      });

      const result = await this.provider.send(
        reminder.phone,
        text,
        reminder.id,
      );

      await this.repository.complete(reminder, result, now);
    }

    return { processed };
  }
}
