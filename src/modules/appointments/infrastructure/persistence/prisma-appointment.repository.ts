import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/infrastructure/prisma/prisma.service';
import { AppointmentRepository } from '../../application/ports/appointment.repository';
import { Appointment } from '../../domain/appointment.entity';
import { Reminder } from '../../domain/reminder.entity';

@Injectable()
export class PrismaAppointmentRepository extends AppointmentRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async saveWithReminder(
    appointment: Appointment,
    reminder: Reminder,
  ): Promise<{ appointment: Appointment; reminder: Reminder }> {
    const saved = await this.prisma.appointment.create({
      data: {
        id: appointment.id,
        clinicId: appointment.clinicId,
        patientId: appointment.patientId,
        startsAt: appointment.startsAt,
        status: appointment.status,
        reminders: {
          create: {
            id: reminder.id,
            scheduledFor: reminder.scheduledFor,
            status: reminder.status,
            attempts: reminder.attempts,
          },
        },
      },
      include: {
        reminders: true,
      },
    });

    const savedReminder = saved.reminders[0];

    return {
      appointment: new Appointment(
        saved.id,
        saved.clinicId,
        saved.patientId,
        saved.startsAt,
        saved.status,
      ),
      reminder: new Reminder(
        savedReminder.id,
        savedReminder.appointmentId,
        savedReminder.scheduledFor,
        savedReminder.status,
        savedReminder.attempts,
        savedReminder.sentAt,
        savedReminder.skipReason,
      ),
    };
  }
}
