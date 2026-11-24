import { calculateReminderSchedule } from './reminder-schedule';

export type ReminderStatus =
  | 'pending'
  | 'sent'
  | 'failed'
  | 'skipped'
  | 'cancelled';

export class Reminder {
  static create(
    id: string,
    appointmentId: string,
    startsAt: Date,
    timezone: string,
    now: Date,
  ): Reminder {
    const scheduledFor = calculateReminderSchedule(
      startsAt,
      timezone,
      now,
    );

    const tooLate = scheduledFor >= startsAt;

    return new Reminder(
      id,
      appointmentId,
      scheduledFor,
      tooLate ? 'skipped' : 'pending',
      0,
      null,
      tooLate ? 'too_late' : null,
    );
  }

  constructor(
    public readonly id: string,
    public readonly appointmentId: string,
    public readonly scheduledFor: Date,
    public readonly status: ReminderStatus,
    public readonly attempts: number,
    public readonly sentAt: Date | null,
    public readonly skipReason: 'too_late' | 'no_phone' | 'opted_out' | null,
  ) {}
}
