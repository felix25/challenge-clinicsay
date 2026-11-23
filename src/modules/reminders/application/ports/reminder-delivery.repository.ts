export interface ClaimedReminder {
  id: string;
  claimToken: string;
  appointmentId: string;
  startsAt: Date;
  appointmentStatus: string;
  patientName: string;
  phone: string | null;
  acceptsReminders: boolean;
  clinicName: string;
  timezone: string;
}

export abstract class ReminderDeliveryRepository {
  abstract claimNext(now: Date): Promise<ClaimedReminder | null>;

  abstract complete(
    reminder: ClaimedReminder,
    outcome: 'sent' | 'retry' | 'failed' | 'skipped',
    now: Date,
    skipReason?: 'too_late' | 'no_phone' | 'opted_out',
  ): Promise<void>;
}
