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

  async findById(id: string) {
    const saved = await this.prisma.appointment.findUnique({
      where: { id },
      include: {
        reminders: {
          orderBy: [
            { scheduledFor: 'asc' },
            { id: 'asc' },
          ],
        },
      },
    });

    if (!saved) {
      return null;
    }

    return {
      appointment: new Appointment(
        saved.id,
        saved.clinicId,
        saved.patientId,
        saved.startsAt,
        saved.status,
      ),
      reminders: saved.reminders.map(
        (reminder) =>
          new Reminder(
            reminder.id,
            reminder.appointmentId,
            reminder.scheduledFor,
            reminder.status,
            reminder.attempts,
            reminder.sentAt,
            reminder.skipReason,
          ),
      ),
    };
  }

  async reschedule(
    id: string,
    startsAt: Date,
    reminder: Reminder,
  ) {
    return this.prisma.$transaction(async (tx) => {
      // Bloqueamos la cita para serializar reprogramaciones simultáneas.
      const rows = await tx.$queryRaw<Array<{ id: string; status: string }>>`
        SELECT id, status
        FROM "Appointment"
        WHERE id = ${id}
        FOR UPDATE
      `;

      if (rows.length === 0 || rows[0].status === 'cancelled') {
        return null;
      }

      await tx.reminder.updateMany({
        where: {
          appointmentId: id,
          status: 'pending',
        },
        data: {
          status: 'cancelled',
        },
      });

      const saved = await tx.appointment.update({
        where: { id },
        data: {
          startsAt,
          status: 'scheduled',
          reminders: {
            create: {
              id: reminder.id,
              scheduledFor: reminder.scheduledFor,
              status: 'pending',
              attempts: 0,
            },
          },
        },
        include: {
          reminders: {
            orderBy: [
              { scheduledFor: 'asc' },
              { id: 'asc' },
            ],
          },
        },
      });

      return {
        appointment: new Appointment(
          saved.id,
          saved.clinicId,
          saved.patientId,
          saved.startsAt,
          saved.status,
        ),
        reminders: saved.reminders.map(
          (item) =>
            new Reminder(
              item.id,
              item.appointmentId,
              item.scheduledFor,
              item.status,
              item.attempts,
              item.sentAt,
              item.skipReason,
            ),
        ),
      };
    });
  }

  async cancel(id: string) {
    return this.prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<Array<{ id: string }>>`
        SELECT id
        FROM "Appointment"
        WHERE id = ${id}
        FOR UPDATE
      `;

      if (rows.length === 0) {
        return null;
      }

      await tx.appointment.update({
        where: { id },
        data: { status: 'cancelled' },
      });

      await tx.reminder.updateMany({
        where: {
          appointmentId: id,
          status: 'pending',
        },
        data: {
          status: 'cancelled',
        },
      });

      const saved = await tx.appointment.findUniqueOrThrow({
        where: { id },
        include: {
          reminders: {
            orderBy: [
              { scheduledFor: 'asc' },
              { id: 'asc' },
            ],
          },
        },
      });

      return {
        appointment: new Appointment(
          saved.id,
          saved.clinicId,
          saved.patientId,
          saved.startsAt,
          saved.status,
        ),
        reminders: saved.reminders.map(
          (item) =>
            new Reminder(
              item.id,
              item.appointmentId,
              item.scheduledFor,
              item.status,
              item.attempts,
              item.sentAt,
              item.skipReason,
            ),
        ),
      };
    });
  }
}
