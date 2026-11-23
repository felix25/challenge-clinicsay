import { Injectable, NotFoundException } from '@nestjs/common';
import { AppointmentRepository } from '../ports/appointment.repository';

@Injectable()
export class CancelAppointmentUseCase {
  constructor(
    private readonly appointments: AppointmentRepository,
  ) {}

  async execute(id: string) {
    const result = await this.appointments.cancel(id);

    if (!result) {
      throw new NotFoundException('Appointment not found');
    }

    return {
      id: result.appointment.id,
      clinicId: result.appointment.clinicId,
      patientId: result.appointment.patientId,
      startsAt: result.appointment.startsAt.toISOString(),
      status: result.appointment.status,
      reminders: result.reminders.map((reminder) => ({
        id: reminder.id,
        scheduledFor: reminder.scheduledFor.toISOString(),
        status: reminder.status,
        attempts: reminder.attempts,
        sentAt: reminder.sentAt?.toISOString() ?? null,
        skipReason: reminder.skipReason,
      })),
    };
  }
}
