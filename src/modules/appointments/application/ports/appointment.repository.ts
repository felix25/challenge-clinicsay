import { Appointment } from '../../domain/appointment.entity';
import { Reminder } from '../../domain/reminder.entity';

export interface AppointmentWithReminders {
  appointment: Appointment;
  reminders: Reminder[];
}

export abstract class AppointmentRepository {
  abstract saveWithReminder(
    appointment: Appointment,
    reminder: Reminder,
  ): Promise<{ appointment: Appointment; reminder: Reminder }>;

  abstract reschedule(
    id: string,
    startsAt: Date,
    reminder: Reminder,
  ): Promise<AppointmentWithReminders | null>;

  abstract cancel(id: string): Promise<AppointmentWithReminders | null>;

  abstract findById(
    id: string,
  ): Promise<AppointmentWithReminders | null>;
}
