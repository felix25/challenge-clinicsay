import { Injectable, NotFoundException } from '@nestjs/common';
import { AppointmentRepository } from '../ports/appointment.repository';

@Injectable()
export class GetAppointmentUseCase {
  constructor(
    private readonly appointments: AppointmentRepository,
  ) {}

  async execute(id: string) {
    const result = await this.appointments.findById(id);

    if (!result) {
      throw new NotFoundException('Appointment not found');
    }

    const { appointment, reminders } = result;

    return {
      id: appointment.id,
      clinicId: appointment.clinicId,
      patientId: appointment.patientId,
      startsAt: appointment.startsAt.toISOString(),
      status: appointment.status,
      reminders: reminders.map((reminder) => ({
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
