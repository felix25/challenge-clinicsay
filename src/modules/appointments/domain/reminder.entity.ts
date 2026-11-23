export type ReminderStatus =
  | 'pending'
  | 'sent'
  | 'failed'
  | 'skipped'
  | 'cancelled';

export class Reminder {
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
