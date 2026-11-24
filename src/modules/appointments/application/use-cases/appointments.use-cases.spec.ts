import { jest } from '@jest/globals';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';

import { Clock } from '../../../../shared/application/ports/clock';
import { Clinic } from '../../../clinics/domain/clinic.entity';
import { ClinicRepository } from '../../../clinics/application/ports/clinic.repository';
import { Patient } from '../../../patients/domain/patient.entity';
import { PatientRepository } from '../../../patients/application/ports/patient.repository';

import { Appointment } from '../../domain/appointment.entity';
import { Reminder } from '../../domain/reminder.entity';
import { AppointmentRepository } from '../ports/appointment.repository';

import { CreateAppointmentUseCase } from './create-appointment.use-case';
import { GetAppointmentUseCase } from './get-appointment.use-case';
import { CancelAppointmentUseCase } from './cancel-appointment.use-case';
import { RescheduleAppointmentUseCase } from './reschedule-appointment.use-case';

describe('Appointment use cases', () => {
  const now = new Date('2026-11-23T15:00:00Z');
  const startsAt = '2026-11-25T15:00:00Z';

  const clinic = new Clinic(
    'clinic-1', 'Central', 'America/Lima',
  );

  const patient = new Patient(
    'patient-1', 'clinic-1', 'Ana', '+51999999999', true,
  );

  const appointment = new Appointment(
    'appointment-1',
    clinic.id,
    patient.id,
    new Date(startsAt),
    'scheduled',
  );

  const reminder = new Reminder(
    'reminder-1',
    appointment.id,
    new Date('2026-11-24T15:00:00Z'),
    'pending',
    0,
    null,
    null,
  );

  let appointments: jest.Mocked<AppointmentRepository>;
  let clinics: jest.Mocked<ClinicRepository>;
  let patients: jest.Mocked<PatientRepository>;
  let clock: jest.Mocked<Clock>;

  beforeEach(() => {
    appointments = {
      saveWithReminder:
        jest.fn<AppointmentRepository['saveWithReminder']>()
          .mockImplementation(async (appointment, reminder) => ({
            appointment,
            reminder,
          })),

      findById:
        jest.fn<AppointmentRepository['findById']>()
          .mockResolvedValue({
            appointment,
            reminders: [reminder],
          }),

      cancel:
        jest.fn<AppointmentRepository['cancel']>(),

      reschedule:
        jest.fn<AppointmentRepository['reschedule']>(),
    };

    clinics = {
      save: jest.fn<ClinicRepository['save']>(),
      findById: jest.fn<ClinicRepository['findById']>()
        .mockResolvedValue(clinic),
    };

    patients = {
      save: jest.fn<PatientRepository['save']>(),
      findById: jest.fn<PatientRepository['findById']>()
        .mockResolvedValue(patient),
    };

    clock = {
      now: jest.fn<Clock['now']>().mockReturnValue(now),
    };
  });

  describe('CreateAppointmentUseCase', () => {
    function createUseCase() {
      return new CreateAppointmentUseCase(
        appointments, clinics, patients, clock,
      );
    }

    it('creates an appointment and its pending reminder', async () => {
      const result = await createUseCase().execute(
        clinic.id, patient.id, startsAt,
      );

      expect(result.status).toBe('scheduled');
      expect(result.startsAt).toBe(
        '2026-11-25T15:00:00.000Z',
      );

      expect(result.reminders).toHaveLength(1);

      expect(result.reminders[0]).toMatchObject({
        status: 'pending',
        attempts: 0,
        scheduledFor: '2026-11-24T15:00:00.000Z',
        sentAt: null,
        skipReason: null,
      });

      expect(appointments.saveWithReminder)
        .toHaveBeenCalledTimes(1);
    });

    it('rejects a nonexistent clinic', async () => {
      clinics.findById.mockResolvedValue(null);

      await expect(
        createUseCase().execute(clinic.id, patient.id, startsAt),
      ).rejects.toBeInstanceOf(NotFoundException);

      expect(appointments.saveWithReminder)
        .not.toHaveBeenCalled();
    });

    it('rejects a nonexistent patient', async () => {
      patients.findById.mockResolvedValue(null);

      await expect(
        createUseCase().execute(clinic.id, patient.id, startsAt),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('rejects patients belonging to another clinic', async () => {
      patients.findById.mockResolvedValue(
        new Patient(
          patient.id, 'other-clinic', 'Ana', null, true,
        ),
      );

      await expect(
        createUseCase().execute(clinic.id, patient.id, startsAt),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(appointments.saveWithReminder)
        .not.toHaveBeenCalled();
    });

    it.each([
      'invalid-date',
      '2026-11-22T15:00:00Z',
      '2026-11-23T15:00:00Z',
    ])('rejects invalid or nonfuture date %s', async (date) => {
      await expect(
        createUseCase().execute(clinic.id, patient.id, date),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(appointments.saveWithReminder)
        .not.toHaveBeenCalled();
    });
  });

  describe('GetAppointmentUseCase', () => {
    it('returns the appointment and its reminders', async () => {
      const result = await new GetAppointmentUseCase(
        appointments,
      ).execute(appointment.id);

      expect(result.id).toBe(appointment.id);
      expect(result.status).toBe('scheduled');
      expect(result.reminders).toHaveLength(1);
      expect(result.reminders[0].sentAt).toBeNull();
    });

    it('rejects a nonexistent appointment', async () => {
      appointments.findById.mockResolvedValue(null);

      await expect(
        new GetAppointmentUseCase(appointments).execute('missing'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('CancelAppointmentUseCase', () => {
    it('returns the cancelled appointment', async () => {
      appointments.cancel.mockResolvedValue({
        appointment: new Appointment(
          appointment.id,
          clinic.id,
          patient.id,
          appointment.startsAt,
          'cancelled',
        ),
        reminders: [
          new Reminder(
            reminder.id,
            appointment.id,
            reminder.scheduledFor,
            'cancelled',
            0,
            null,
            null,
          ),
        ],
      });

      const result = await new CancelAppointmentUseCase(
        appointments,
      ).execute(appointment.id);

      expect(result.status).toBe('cancelled');
      expect(result.reminders[0].status).toBe('cancelled');
      expect(appointments.cancel)
        .toHaveBeenCalledWith(appointment.id);
    });

    it('rejects a nonexistent appointment', async () => {
      appointments.cancel.mockResolvedValue(null);

      await expect(
        new CancelAppointmentUseCase(appointments)
          .execute('missing'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('RescheduleAppointmentUseCase', () => {
    function createUseCase() {
      return new RescheduleAppointmentUseCase(
        appointments, clinics, clock,
      );
    }

    it('reschedules the appointment and creates a new reminder', async () => {
      const newDate = '2026-11-27T15:00:00Z';

      appointments.reschedule.mockImplementation(
        async (id, date, newReminder) => ({
          appointment: new Appointment(
            id, clinic.id, patient.id, date, 'scheduled',
          ),
          reminders: [newReminder],
        }),
      );

      const result = await createUseCase().execute(
        appointment.id, newDate,
      );

      expect(result.startsAt).toBe(
        '2026-11-27T15:00:00.000Z',
      );

      expect(result.reminders[0]).toMatchObject({
        status: 'pending',
        attempts: 0,
        scheduledFor: '2026-11-26T15:00:00.000Z',
      });

      expect(appointments.reschedule)
        .toHaveBeenCalledTimes(1);
    });

    it('rejects a nonexistent appointment', async () => {
      appointments.findById.mockResolvedValue(null);

      await expect(
        createUseCase().execute('missing', startsAt),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('rejects a cancelled appointment', async () => {
      appointments.findById.mockResolvedValue({
        appointment: new Appointment(
          appointment.id,
          clinic.id,
          patient.id,
          appointment.startsAt,
          'cancelled',
        ),
        reminders: [],
      });

      await expect(
        createUseCase().execute(appointment.id, startsAt),
      ).rejects.toBeInstanceOf(ConflictException);

      expect(appointments.reschedule).not.toHaveBeenCalled();
    });

    it.each([
      '2026-11-23T14:00:00Z',
      '2026-11-23T15:00:00Z',
    ])('rejects an appointment already started at %s', async (date) => {
      appointments.findById.mockResolvedValue({
        appointment: new Appointment(
          appointment.id,
          clinic.id,
          patient.id,
          new Date(date),
          'scheduled',
        ),
        reminders: [],
      });

      await expect(
        createUseCase().execute(
          appointment.id,
          '2026-11-27T15:00:00Z',
        ),
      ).rejects.toBeInstanceOf(ConflictException);

      expect(appointments.reschedule).not.toHaveBeenCalled();
    });

    it.each([
      '2026-11-23T14:00:00Z',
      '2026-11-23T15:00:00Z',
    ])('rejects an appointment already started at %s', async (date) => {
      appointments.findById.mockResolvedValue({
        appointment: new Appointment(
          appointment.id,
          clinic.id,
          patient.id,
          new Date(date),
          'scheduled',
        ),
        reminders: [],
      });

      await expect(
        createUseCase().execute(
          appointment.id,
          '2026-11-27T15:00:00Z',
        ),
      ).rejects.toBeInstanceOf(ConflictException);

      expect(appointments.reschedule).not.toHaveBeenCalled();
    });

    it('rejects a date in the past', async () => {
      await expect(
        createUseCase().execute(
          appointment.id, '2026-11-22T15:00:00Z',
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });
});
