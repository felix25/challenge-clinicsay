import { Appointment } from '../../domain/appointment.entity';
import { Reminder } from '../../domain/reminder.entity';

export abstract class AppointmentRepository {
  abstract saveWithReminder(
    appointment: Appointment,
    reminder: Reminder,
  ): Promise<{ appointment: Appointment; reminder: Reminder }>;
}
