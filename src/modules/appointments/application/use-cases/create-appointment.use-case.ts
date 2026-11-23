import { Clock } from '../../../../shared/application/ports/clock';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { ClinicRepository } from '../../../clinics/application/ports/clinic.repository';
import { PatientRepository } from '../../../patients/application/ports/patient.repository';
import { Appointment } from '../../domain/appointment.entity';
import { Reminder } from '../../domain/reminder.entity';
import { calculateReminderSchedule } from '../../domain/reminder-schedule';
import { AppointmentRepository } from '../ports/appointment.repository';

@Injectable()
export class CreateAppointmentUseCase {
  constructor(
    private readonly appointments: AppointmentRepository,
    private readonly clinics: ClinicRepository,
    private readonly patients: PatientRepository,
    private readonly clock: Clock,
  ) {}

  async execute(clinicId: string, patientId: string, startsAt: string) {
    const clinic = await this.clinics.findById(clinicId);

    if (!clinic) {
      throw new NotFoundException('Clinic not found');
    }

    const patient = await this.patients.findById(patientId);

    if (!patient || patient.clinicId !== clinicId) {
      throw new NotFoundException('Patient not found in clinic');
    }

    const date = new Date(startsAt);
    const now = this.clock.now();

    if (Number.isNaN(date.getTime()) || date <= now) {
      throw new BadRequestException('Appointment must be in the future');
    }

    const appointment = new Appointment(
      randomUUID(),
      clinicId,
      patientId,
      date,
      'scheduled',
    );

    const reminder = new Reminder(
      randomUUID(),
      appointment.id,
      calculateReminderSchedule(date, clinic.timezone, now),
      'pending',
      0,
      null,
      null,
    );

    const result = await this.appointments.saveWithReminder(
      appointment,
      reminder,
    );

    return {
      id: result.appointment.id,
      clinicId: result.appointment.clinicId,
      patientId: result.appointment.patientId,
      startsAt: result.appointment.startsAt.toISOString(),
      status: result.appointment.status,
      reminders: [
        {
          id: result.reminder.id,
          scheduledFor: result.reminder.scheduledFor.toISOString(),
          status: result.reminder.status,
          attempts: result.reminder.attempts,
          sentAt: result.reminder.sentAt,
          skipReason: result.reminder.skipReason,
        },
      ],
    };
  }
}
