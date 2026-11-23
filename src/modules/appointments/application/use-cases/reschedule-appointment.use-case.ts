import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Clock } from '../../../../shared/application/ports/clock';
import { ClinicRepository } from '../../../clinics/application/ports/clinic.repository';
import { Reminder } from '../../domain/reminder.entity';
import { calculateReminderSchedule } from '../../domain/reminder-schedule';
import { AppointmentRepository } from '../ports/appointment.repository';

@Injectable()
export class RescheduleAppointmentUseCase {
  constructor(
    private readonly appointments: AppointmentRepository,
    private readonly clinics: ClinicRepository,
    private readonly clock: Clock,
  ) {}

  async execute(id: string, startsAt: string) {
    const existing = await this.appointments.findById(id);

    if (!existing) {
      throw new NotFoundException('Appointment not found');
    }

    if (existing.appointment.status === 'cancelled') {
      throw new ConflictException('Cancelled appointment cannot be rescheduled');
    }

    const date = new Date(startsAt);
    const now = this.clock.now();

    if (Number.isNaN(date.getTime()) || date <= now) {
      throw new BadRequestException('Appointment must be in the future');
    }

    const clinic = await this.clinics.findById(existing.appointment.clinicId);

    if (!clinic) {
      throw new NotFoundException('Clinic not found');
    }

    const reminder = new Reminder(
      randomUUID(),
      id,
      calculateReminderSchedule(date, clinic.timezone, now),
      'pending',
      0,
      null,
      null,
    );

    const updated = await this.appointments.reschedule(id, date, reminder);

    if (!updated) {
      throw new ConflictException('Appointment cannot be rescheduled');
    }

    return {
      id: updated.appointment.id,
      clinicId: updated.appointment.clinicId,
      patientId: updated.appointment.patientId,
      startsAt: updated.appointment.startsAt.toISOString(),
      status: updated.appointment.status,
      reminders: updated.reminders.map((item) => ({
        id: item.id,
        scheduledFor: item.scheduledFor.toISOString(),
        status: item.status,
        attempts: item.attempts,
        sentAt: item.sentAt?.toISOString() ?? null,
        skipReason: item.skipReason,
      })),
    };
  }
}
